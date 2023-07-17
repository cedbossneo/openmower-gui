package api

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/bluenviron/goroslib/v2"
	"github.com/bluenviron/goroslib/v2/pkg/msgs/diagnostic_msgs"
	"github.com/bluenviron/goroslib/v2/pkg/msgs/geometry_msgs"
	"github.com/bluenviron/goroslib/v2/pkg/msgs/sensor_msgs"
	"github.com/gin-contrib/sse"
	"github.com/gin-gonic/gin"
	"io"
	"log"
	"mowgli-gui/pkg/msgs"
	"os"
	"strconv"
)

func OpenMowerRoutes(r *gin.RouterGroup) {
	group := r.Group("/openmower")
	ServiceRoute(group)
	SubscriberRoute(group)
}

func SubscriberRoute(group *gin.RouterGroup) {
	group.GET("/subscribe/:topic", func(c *gin.Context) {
		// create a node and connect to the master
		topic := c.Param("topic")
		rosNode, err := getNode()
		if err != nil {
			c.JSON(500, gin.H{
				"error": err.Error(),
			})
			return
		}

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
		// create a subscriber
		switch topic {
		case "diagnostics":
			sub, err = subscribe[*diagnostic_msgs.DiagnosticArray](rosNode, &done, &chanStream, "/diagnostics")
		case "status":
			sub, err = subscribe[*msgs.Status](rosNode, &done, &chanStream, "/mower_service/status")
		case "xb_pose":
			sub, err = subscribe[*geometry_msgs.Pose](rosNode, &done, &chanStream, "/xbot_driver_gps/xb_pose")
		case "imu":
			sub, err = subscribe[*sensor_msgs.Imu](rosNode, &done, &chanStream, "/imu/data_raw")
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

func subscribe[T any](rosNode *goroslib.Node, done *chan bool, chanStream *chan string, topic string) (*goroslib.Subscriber, error) {
	return goroslib.NewSubscriber(goroslib.SubscriberConf{
		Node:  rosNode,
		Topic: topic,
		Callback: func(msg T) {
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
	})
}

var node *goroslib.Node

func getNode() (*goroslib.Node, error) {
	var err error
	if node != nil {
		return node, err
	}
	node, err = goroslib.NewNode(goroslib.NodeConf{
		Name:          "goroslib_pub",
		MasterAddress: os.Getenv("ROS_MASTER_URI"),
	})
	return node, err
}

func ServiceRoute(group *gin.RouterGroup) {
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
			err = callService(c.Request.Context(), "/mower_service/high_level_control", &msgs.HighLevelControlSrv{}, &msgs.HighLevelControlSrvReq{
				Command: 1,
			}, &msgs.HighLevelControlSrvRes{})
		case "mower_home":
			err = callService(c.Request.Context(), "/mower_service/high_level_control", &msgs.HighLevelControlSrv{}, &msgs.HighLevelControlSrvReq{
				Command: 2,
			}, &msgs.HighLevelControlSrvRes{})
		case "mower_s1":
			err = callService(c.Request.Context(), "/mower_service/high_level_control", &msgs.HighLevelControlSrv{}, &msgs.HighLevelControlSrvReq{
				Command: 3,
			}, &msgs.HighLevelControlSrvRes{})
		case "mower_s2":
			err = callService(c.Request.Context(), "/mower_service/high_level_control", &msgs.HighLevelControlSrv{}, &msgs.HighLevelControlSrvReq{
				Command: 4,
			}, &msgs.HighLevelControlSrvRes{})
		case "emergency":
			err = callService(c.Request.Context(), "/mower_service/emergency", &msgs.EmergencyStopSrv{}, &msgs.EmergencyStopSrvReq{
				Emergency: uint8(CallReq["emergency"].(float64)),
			}, &msgs.EmergencyStopSrvRes{})
		case "mow":
			err = callService(c.Request.Context(), "/mower_service/mow_enabled", &msgs.MowerControlSrv{}, &msgs.MowerControlSrvReq{
				MowEnabled:   uint8(CallReq["mow_enabled"].(float64)),
				MowDirection: uint8(CallReq["mow_direction"].(float64)),
			}, &msgs.MowerControlSrvRes{})
		default:
			err = errors.New("unknown command")
		}
		if err != nil {
			c.JSON(500, gin.H{
				"error": err.Error(),
			})
		} else {
			c.JSON(200, gin.H{})
		}
	})
}

func callService(ctx context.Context, srvName string, srv any, req any, res any) error {
	rosNode, err := getNode()
	if err != nil {
		return err
	}
	serviceClient, err := goroslib.NewServiceClient(goroslib.ServiceClientConf{
		Node: rosNode,
		Name: srvName,
		Srv:  srv,
	})
	err = serviceClient.CallContext(ctx, req, res)
	if err != nil {
		return err
	}
	return nil
}
