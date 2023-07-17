package api

import (
	"bufio"
	"context"
	"encoding/base64"
	"fmt"
	"github.com/docker/docker/api/types"
	docker "github.com/docker/docker/client"
	"github.com/gin-contrib/sse"
	"github.com/gin-gonic/gin"
	"github.com/samber/lo"
	"io"
	"log"
	"strconv"
	"sync"
)

func ContainersRoutes(r *gin.RouterGroup) {
	group := r.Group("/containers")
	ContainerListRoutes(group)
	ContainerLogsRoutes(group)
	ContainerCommandRoutes(group)
}

func ContainerListRoutes(group *gin.RouterGroup) {
	group.GET("/", func(c *gin.Context) {
		client, err := docker.NewClientWithOpts(docker.FromEnv)
		if err != nil {
			c.Error(err)
			return
		}
		containers, err := client.ContainerList(c.Request.Context(), types.ContainerListOptions{
			All: true,
		})
		if err != nil {
			c.Error(err)
			return
		}
		containersFiltered := lo.Filter(containers, func(container types.Container, idx int) bool {
			return container.Labels["project"] == "mowgli"
		})
		c.JSON(200, gin.H{
			"containers": containersFiltered,
		})
	})
}

func ContainerCommandRoutes(group *gin.RouterGroup) {
	group.POST("/:containerId/:command", func(c *gin.Context) {
		containerID := c.Param("containerId")
		command := c.Param("command")

		client, err := docker.NewClientWithOpts(docker.FromEnv)
		if err != nil {
			c.Error(err)
			return
		}

		switch command {
		case "restart":
			err = client.ContainerRestart(c.Request.Context(), containerID, nil)
		case "stop":
			err = client.ContainerStop(c.Request.Context(), containerID, nil)
		case "start":
			err = client.ContainerStart(c.Request.Context(), containerID, types.ContainerStartOptions{})
		}
		if err != nil {
			c.Error(err)
			return
		}
	})
}

func ContainerLogsRoutes(group *gin.RouterGroup) {
	group.GET("/:containerId/logs", func(c *gin.Context) {
		containerID := c.Param("containerId")

		client, err := docker.NewClientWithOpts(docker.FromEnv)
		if err != nil {
			return
		}

		/*
		  we don't want the stream lasts forever, set the timeout
		*/
		ctx := context.Background()
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
		reader, err := client.ContainerLogs(ctx, containerID, types.ContainerLogsOptions{ShowStdout: true, ShowStderr: true, Follow: true, Tail: "100"})
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
