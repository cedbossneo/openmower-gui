package api

import (
	"bufio"
	"fmt"
	"github.com/docker/docker/api/types"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/samber/lo"
	"log"
	types2 "mowgli-gui/pkg/types"
	"net/http"
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
	var upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin:     func(r *http.Request) bool { return true },
	}

	group.GET("/:containerId/logs", func(c *gin.Context) {
		containerID := c.Param("containerId")
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}
		defer conn.Close()

		chanStream := make(chan string) // to consume lines read from docker
		done := make(chan bool)         // to indicate when the work is done
		/*
		   read the logs from docker using docker SDK. be noticed that the Follow value must set to true.
		*/
		reader, err := provider.ContainerLogs(c.Request.Context(), containerID)
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
		for {
			select {
			case <-c.Done():
				reader.Close()
				return
			case <-done:
				reader.Close()
				return
			case msg := <-chanStream:
				// send events to client
				err := conn.WriteMessage(websocket.TextMessage, []byte(msg))
				if err != nil {
					c.JSON(500, gin.H{
						"error": err.Error(),
					})
					return
				}
				return
			}
		}
	})
}
