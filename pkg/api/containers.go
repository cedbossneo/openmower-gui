package api

import (
	"bufio"
	"context"
	"encoding/base64"
	"fmt"
	types2 "github.com/cedbossneo/openmower-gui/pkg/types"
	"github.com/docker/docker/api/types"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/samber/lo"
	"io"
	"log"
	"net/http"
)

func ContainersRoutes(r *gin.RouterGroup, provider types2.IDockerProvider) {
	group := r.Group("/containers")
	ContainerUpgrade(group, provider)
	ContainerUpdateCheck(group, provider)
	ContainerListRoutes(group, provider)
	ContainerLogsRoutes(group, provider)
	ContainerCommandRoutes(group, provider)
}

// ContainerUpdateCheck check for container updates
//
// @Summary check for container updates
// @Description check for container updates
// @Tags containers
// @Produce  json
// @Success 200 {object} ContainerListResponse
// @Failure 500 {object} ErrorResponse
// @Router /containers/updates [get]
func ContainerUpdateCheck(group *gin.RouterGroup, provider types2.IDockerProvider) {
	group.GET("/updates", func(c *gin.Context) {
		containers, err := provider.ContainerList(c.Request.Context())
		if err != nil {
			c.JSON(500, ErrorResponse{Error: err.Error()})
			return
		}
		containersFiltered := lo.Map(lo.Filter(containers, func(container types.Container, idx int) bool {
			return container.Labels["project"] == "openmower"
		}), func(container types.Container, idx int) Container {
			check, err := provider.ImageUpdateCheck(c.Request.Context(), container.ID)
			if err != nil {
				c.JSON(500, ErrorResponse{Error: err.Error()})
				return Container{}
			}
			return Container{
				ID:     container.ID,
				Names:  container.Names,
				Labels: container.Labels,
				State:  container.State,
				Update: check,
			}
		})
		c.JSON(200, ContainerListResponse{Containers: containersFiltered})
	})
}

// ContainerUpgrade upgrade a container
//
// @Summary upgrade a container
// @Description upgrade a container
// @Tags containers
// @Produce  json
// @Param containerId path string true "container id"
// @Success 200 {object} OkResponse
// @Failure 500 {object} ErrorResponse
// @Router /containers/{containerId}/upgrade [post]
func ContainerUpgrade(group *gin.RouterGroup, provider types2.IDockerProvider) {
	group.POST("/:containerId/upgrade", func(c *gin.Context) {
		containerID := c.Param("containerId")
		err := provider.ContainerUpgrade(c.Request.Context(), containerID)
		if err != nil {
			c.JSON(500, ErrorResponse{Error: err.Error()})
		} else {
			c.JSON(200, OkResponse{})
		}
	})
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
		c.JSON(200, ContainerListResponse{Containers: lo.Map(containers, func(container types.Container, idx int) Container {
			if container.Labels == nil {
				container.Labels = map[string]string{}
			}
			if lo.Contains(container.Names, "/openmower") {
				container.Labels["project"] = "openmower"
				container.Labels["app"] = "openmower"
			}
			if lo.Contains(container.Names, "/openmower-gui") {
				container.Labels["project"] = "openmower"
				container.Labels["app"] = "gui"
			}
			return Container{
				ID:     container.ID,
				Names:  container.Names,
				Labels: container.Labels,
				State:  container.State,
			}
		})})
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
		defer func(conn *websocket.Conn) {
			err := conn.Close()
			if err != nil {
				fmt.Println("error closing websocket connection: ", err.Error())
			}
		}(conn)

		/*
		   read the logs from docker using docker SDK. be noticed that the Follow value must set to true.
		*/
		reader, err := provider.ContainerLogs(context.Background(), containerID)
		if err != nil {
			fmt.Println("error reader: ", err.Error())
			return
		}
		defer func(reader io.ReadCloser) {
			err := reader.Close()
			if err != nil {
				fmt.Println("error closing reader: ", err.Error())
			}
		}(reader)
		/*
		   send log lines to channel
		*/
		rd := bufio.NewReader(reader)
		for {
			// read lines from the reader
			str, _, err := rd.ReadLine()
			if err != nil {
				log.Println("Read Error:", err.Error())
				return
			}
			// send events to client
			err = conn.WriteMessage(websocket.TextMessage, []byte(base64.StdEncoding.EncodeToString(str)))
			if err != nil {
				log.Println("Write Error:", err.Error())
				return
			}
			// send the lines to channel
		}
	})
}
