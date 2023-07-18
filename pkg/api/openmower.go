package api

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/bluenviron/goroslib/v2"
	"github.com/bluenviron/goroslib/v2/pkg/msgs/diagnostic_msgs"
	"github.com/bluenviron/goroslib/v2/pkg/msgs/sensor_msgs"
	"github.com/gin-contrib/sse"
	"github.com/gin-gonic/gin"
	"io"
	"log"
	"mowgli-gui/pkg/msgs"
	"mowgli-gui/pkg/types"
	"strconv"
)

func OpenMowerRoutes(r *gin.RouterGroup, provider types.IRosProvider) {
	group := r.Group("/openmower")
	ServiceRoute(group, provider)
	SubscriberRoute(group, provider)
}

// SubscriberRoute subscribe to a topic
//
// @Summary subscribe to a topic
// @Description subscribe to a topic
// @Tags openmower
// @Produce  text/event-stream
// @Param topic path string true "topic to subscribe to, could be: diagnostics, status, gps, imu, ticks"
// @Router /openmower/subscribe/{topic} [get]
func SubscriberRoute(group *gin.RouterGroup, provider types.IRosProvider) {
	group.GET("/subscribe/:topic", func(c *gin.Context) {
		// create a node and connect to the master
		topic := c.Param("topic")
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
		var sub *goroslib.Subscriber
		var err error
		// create a subscriber
		switch topic {
		case "diagnostics":
			sub, err = subscribe[*diagnostic_msgs.DiagnosticArray](provider, &done, &chanStream, "/diagnostics")
		case "status":
			sub, err = subscribe[*msgs.Status](provider, &done, &chanStream, "/mower/status")
		case "gps":
			sub, err = subscribe[*msgs.AbsolutePose](provider, &done, &chanStream, "/xbot_driver_gps/xb_pose")
		case "imu":
			sub, err = subscribe[*sensor_msgs.Imu](provider, &done, &chanStream, "/imu/data_raw")
		case "ticks":
			sub, err = subscribe[*msgs.WheelTick](provider, &done, &chanStream, "/mower/wheel_ticks")
		}
		if err != nil {
			done <- true
			return
		}
		/*
		   send log lines to channel
		*/
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
		if err != nil {
			c.JSON(500, gin.H{
				"error": err.Error(),
			})
			return
		}
		defer sub.Close()
	})
}

func subscribe[T any](provider types.IRosProvider, done *chan bool, chanStream *chan string, topic string) (*goroslib.Subscriber, error) {
	return provider.Subscribe(topic, func(msg T) {
		// read lines from the reader
		str, err := json.Marshal(msg)
		if err != nil {
			log.Println("Read Error:", err.Error())
			*done <- true
			return
		}
		// send the lines to channel
		*chanStream <- string(str)
	},
	)
}

// ServiceRoute call a service
//
// @Summary call a service
// @Description call a service
// @Tags openmower
// @Accept  json
// @Produce  json
// @Param command path string true "command to call, could be: mower_start, mower_home, mower_s1, mower_s2, emergency, mow"
// @Param CallReq body map[string]interface{} true "request body"
// @Success 200 {object} OkResponse
// @Failure 500 {object} ErrorResponse
// @Router /openmower/call/{command} [post]
func ServiceRoute(group *gin.RouterGroup, provider types.IRosProvider) {
	// create a node and connect to the master
	group.POST("/call/:command", func(c *gin.Context) {
		// create a node and connect to the master
		command := c.Param("command")
		var CallReq map[string]interface{}
		err := c.BindJSON(&CallReq)
		if err != nil {
			return
		}
		switch command {
		case "mower_start":
			err = provider.CallService(c.Request.Context(), "/mower_service/high_level_control", &msgs.HighLevelControlSrv{}, &msgs.HighLevelControlSrvReq{
				Command: 1,
			}, &msgs.HighLevelControlSrvRes{})
		case "mower_home":
			err = provider.CallService(c.Request.Context(), "/mower_service/high_level_control", &msgs.HighLevelControlSrv{}, &msgs.HighLevelControlSrvReq{
				Command: 2,
			}, &msgs.HighLevelControlSrvRes{})
		case "mower_s1":
			err = provider.CallService(c.Request.Context(), "/mower_service/high_level_control", &msgs.HighLevelControlSrv{}, &msgs.HighLevelControlSrvReq{
				Command: 3,
			}, &msgs.HighLevelControlSrvRes{})
		case "mower_s2":
			err = provider.CallService(c.Request.Context(), "/mower_service/high_level_control", &msgs.HighLevelControlSrv{}, &msgs.HighLevelControlSrvReq{
				Command: 4,
			}, &msgs.HighLevelControlSrvRes{})
		case "emergency":
			err = provider.CallService(c.Request.Context(), "/mower_service/emergency", &msgs.EmergencyStopSrv{}, &msgs.EmergencyStopSrvReq{
				Emergency: uint8(CallReq["emergency"].(float64)),
			}, &msgs.EmergencyStopSrvRes{})
		case "mow":
			err = provider.CallService(c.Request.Context(), "/mower_service/mow_enabled", &msgs.MowerControlSrv{}, &msgs.MowerControlSrvReq{
				MowEnabled:   uint8(CallReq["mow_enabled"].(float64)),
				MowDirection: uint8(CallReq["mow_direction"].(float64)),
			}, &msgs.MowerControlSrvRes{})
		default:
			err = errors.New("unknown command")
		}
		if err != nil {
			c.JSON(500, ErrorResponse{Error: err.Error()})
		} else {
			c.JSON(200, OkResponse{})
		}
	})
}
