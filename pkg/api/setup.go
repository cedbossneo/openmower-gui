package api

import (
	"bufio"
	"github.com/cedbossneo/openmower-gui/pkg/types"
	"github.com/gin-gonic/gin"
	"io"
)

func SetupRoutes(r *gin.RouterGroup, provider types.IFirmwareProvider, ubloxProvider types.IGpsProvider) {
	group := r.Group("/setup")
	FlashBoard(group, provider)
	FlashGPS(group, ubloxProvider)
}

// FlashGPS flash the gps configuration
//
// @Summary flash the gps configuration
// @Description flash the gps configuration
// @Tags setup
// @Accept  json
// @Produce  text/event-stream
// @Success 200 {object} OkResponse
// @Failure 500 {object} ErrorResponse
// @Router /setup/flashGPS [post]
func FlashGPS(group *gin.RouterGroup, provider types.IGpsProvider) gin.IRoutes {
	return group.POST("/flashGPS", func(context *gin.Context) {
		reader, writer := io.Pipe()
		rd := bufio.NewReader(reader)
		go func() {
			err := provider.FlashGPS(writer)
			if err != nil {
				writer.CloseWithError(err)
			} else {
				writer.Close()
			}
		}()
		context.Stream(func(w io.Writer) bool {
			line, _, err2 := rd.ReadLine()
			if err2 != nil {
				if err2 == io.EOF {
					context.SSEvent("end", "end")
					return false
				}
				context.SSEvent("error", err2.Error())
				return false
			}
			context.SSEvent("message", string(line))
			return true
		})
	})
}

// FlashBoard flash the mower board with the given config
//
// @Summary flash the mower board with the given config
// @Description flash the mower board with the given config
// @Tags setup
// @Accept  json
// @Produce  text/event-stream
// @Param settings body types.FirmwareConfig true "config"
// @Success 200 {object} OkResponse
// @Failure 500 {object} ErrorResponse
// @Router /setup/flashBoard [post]
func FlashBoard(r *gin.RouterGroup, provider types.IFirmwareProvider) gin.IRoutes {
	return r.POST("/flashBoard", func(c *gin.Context) {
		var config types.FirmwareConfig
		var err error
		err = c.BindJSON(&config)
		if err != nil {
			c.JSON(500, ErrorResponse{
				Error: err.Error(),
			})
			return
		}
		reader, writer := io.Pipe()
		rd := bufio.NewReader(reader)
		go func() {
			err = provider.FlashFirmware(writer, config)
			if err != nil {
				writer.CloseWithError(err)
			} else {
				writer.Close()
			}
		}()
		c.Stream(func(w io.Writer) bool {
			line, _, err2 := rd.ReadLine()
			if err2 != nil {
				if err2 == io.EOF {
					c.SSEvent("end", "end")
					return false
				}
				c.SSEvent("error", err2.Error())
				return false
			}
			c.SSEvent("message", string(line))
			return true
		})
	})
}
