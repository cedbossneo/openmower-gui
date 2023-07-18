package api

import (
	"bufio"
	"context"
	"encoding/base64"
	"fmt"
	"github.com/docker/docker/api/types"
	"github.com/gin-contrib/sse"
	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
	"io"
	"log"
	types2 "mowgli-gui/pkg/types"
	"strconv"
	"sync"
)

func ContainersRoutes(r *gin.RouterGroup, provider types2.IDockerProvider) {
	group := r.Group("/containers")
	ContainerListRoutes(group, provider)
	ContainerLogsRoutes(group, provider)
	ContainerCommandRoutes(group, provider)
}

// ContainerListRoutes list all containers
//
// @Name list
// @Summary list all containers
// @Description list all containers
// @Tags containers
// @Produce  json
// @Success 200 {object} ContainerListResponse
// @Failure 500 {object} ErrorResponse
// @Router /containers [get]
func ContainerListRoutes(group *gin.RouterGroup, provider types2.IDockerProvider) {
	group.GET("/", func(c *gin.Context) {
		containers, err := provider.ContainerList(c.Request.Context())
		if err != nil {
			c.JSON(500, ErrorResponse{Error: err.Error()})
			return
		}
		containersFiltered := lo.Map(lo.Filter(containers, func(container types.Container, idx int) bool {
			return container.Labels["project"] == "mowgli"
		}), func(container types.Container, idx int) Container {
			return Container{
				ID:     container.ID,
				Names:  container.Names,
				Labels: container.Labels,
				State:  container.State,
			}
		})
		c.JSON(200, ContainerListResponse{Containers: containersFiltered})
	})
}

// ContainerCommandRoutes execute a command on a container
//
// @Summary execute a command on a container
// @Description execute a command on a container
// @Tags containers
// @Produce  json
// @Param containerId path string true "container id"
// @Param command path string true "command to execute (start/stop/restart)"
// @Success 200 {object} OkResponse
// @Failure 500 {object} ErrorResponse
// @Router /containers/{containerId}/{command} [post]
func ContainerCommandRoutes(group *gin.RouterGroup, provider types2.IDockerProvider) {
	group.POST("/:containerId/:command", func(c *gin.Context) {
		containerID := c.Param("containerId")
		command := c.Param("command")
		var err error

		switch command {
		case "restart":
			err = provider.ContainerRestart(c.Request.Context(), containerID)
		case "stop":
			err = provider.ContainerStop(c.Request.Context(), containerID)
		case "start":
			err = provider.ContainerStart(c.Request.Context(), containerID)
		}
		if err != nil {
			c.JSON(500, ErrorResponse{Error: err.Error()})
			return
		}
		c.JSON(200, OkResponse{})
	})
}

// ContainerLogsRoutes stream container logs
//
// @Summary get container logs
// @Description get container logs
// @Tags containers
// @Produce text/event-stream
// @Param containerId path string true "container id"
// @Router /containers/{containerId}/logs [get]
func ContainerLogsRoutes(group *gin.RouterGroup, provider types2.IDockerProvider) {
	group.GET("/:containerId/logs", func(c *gin.Context) {
		containerID := c.Param("containerId")

		chanStream := make(chan string) // to consume lines read from docker
		done := make(chan bool)         // to indicate when the work is done
		/*
		   this is where we handle the request context
		*/
		go func() {
			for {
				select {
				case <-c.Request.Context().Done():
					// client gave up
					done <- true
					return
				}
			}
		}()
		/*
		   read the logs from docker using docker SDK. be noticed that the Follow value must set to true.
		*/
		reader, err := provider.ContainerLogs(context.Background(), containerID)
		if err != nil {
			fmt.Println("error reader: ", err.Error())
			done <- true
			return
		}
		/*
		   send log lines to channel
		*/
		rd := bufio.NewReader(reader)
		var mu sync.RWMutex
		go func() {
			for {
				mu.Lock()
				// read lines from the reader
				str, _, err := rd.ReadLine()
				if err != nil {
					log.Println("Read Error:", err.Error())
					done <- true
					return
				}
				// send the lines to channel
				chanStream <- string(str)
				mu.Unlock()
			}
		}()
		count := 0 // to indicate the message id
		isStreaming := c.Stream(func(w io.Writer) bool {
			for {
				select {
				case <-done:
					// when deadline is reached, send 'end' event
					c.SSEvent("end", "end")
					return false
				case msg := <-chanStream:
					// send events to client
					c.Render(-1, sse.Event{
						Id:    strconv.Itoa(count),
						Event: "message",
						Data:  base64.StdEncoding.EncodeToString([]byte(msg)),
					})
					count++
					return true
				}
			}
		})
		if !isStreaming {
			fmt.Println("stream closed")
		}
	})
}
