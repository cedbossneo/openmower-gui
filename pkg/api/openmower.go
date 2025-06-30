package api

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/bluenviron/goroslib/v2/pkg/msgs/geometry_msgs"
	"github.com/cedbossneo/openmower-gui/pkg/msgs/dynamic_reconfigure"
	"github.com/cedbossneo/openmower-gui/pkg/msgs/mower_map"
	"github.com/cedbossneo/openmower-gui/pkg/msgs/mower_msgs"
	"github.com/cedbossneo/openmower-gui/pkg/types"
	"github.com/docker/distribution/uuid"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

func OpenMowerRoutes(r *gin.RouterGroup, provider types.IRosProvider) {
	group := r.Group("/openmower")
	ServiceRoute(group, provider)
	AddMapAreaRoute(group, provider)
	SetDockingPointRoute(group, provider)
	ClearMapRoute(group, provider)
	SubscriberRoute(group, provider)
	PublisherRoute(group, provider)
}

// AddMapAreaRoute add a map area
//
// @Summary add a map area
// @Description add a map area
// @Tags openmower
// @Accept  json
// @Produce  json
// @Param CallReq body mower_map.AddMowingAreaSrvReq true "request body"
// @Success 200 {object} OkResponse
// @Failure 500 {object} ErrorResponse
// @Router /openmower/map/area/add [post]
func AddMapAreaRoute(group *gin.RouterGroup, provider types.IRosProvider) {
	group.POST("/map/area/add", func(c *gin.Context) {
		var CallReq mower_map.AddMowingAreaSrvReq
		err := unmarshalROSMessage[*mower_map.AddMowingAreaSrvReq](c.Request.Body, &CallReq)
		if err != nil {
			return
		}
		err = provider.CallService(c.Request.Context(), "/mower_map_service/add_mowing_area", &mower_map.AddMowingAreaSrv{}, &CallReq, &mower_map.AddMowingAreaSrvRes{})
		if err != nil {
			c.JSON(500, ErrorResponse{Error: err.Error()})
		} else {
			c.JSON(200, OkResponse{})
		}
	})
}

// ClearMapRoute delete a map area
//
// @Summary clear the map
// @Description clear the map
// @Tags openmower
// @Accept  json
// @Produce  json
// @Success 200 {object} OkResponse
// @Failure 500 {object} ErrorResponse
// @Router /openmower/map [delete]
func ClearMapRoute(group *gin.RouterGroup, provider types.IRosProvider) {
	group.DELETE("/map", func(c *gin.Context) {
		err := provider.CallService(c.Request.Context(), "/mower_map_service/clear_map", &mower_map.ClearMapSrv{}, &mower_map.ClearMapSrvReq{}, &mower_map.ClearMapSrvRes{})
		if err != nil {
			c.JSON(500, ErrorResponse{Error: err.Error()})
		} else {
			c.JSON(200, OkResponse{})
		}
	})
}

// SetDockingPointRoute set the docking point
//
// @Summary set the docking point
// @Description set the docking point
// @Tags openmower
// @Accept  json
// @Produce  json
// @Param CallReq body mower_map.SetDockingPointSrvReq true "request body"
// @Success 200 {object} OkResponse
// @Failure 500 {object} ErrorResponse
// @Router /openmower/map/docking [post]
func SetDockingPointRoute(group *gin.RouterGroup, provider types.IRosProvider) {
	group.POST("/map/docking", func(c *gin.Context) {
		var CallReq mower_map.SetDockingPointSrvReq
		err := unmarshalROSMessage[*mower_map.SetDockingPointSrvReq](c.Request.Body, &CallReq)
		if err != nil {
			return
		}
		err = provider.CallService(c.Request.Context(), "/mower_map_service/set_docking_point", &mower_map.SetDockingPointSrv{}, &CallReq, &mower_map.SetDockingPointSrvRes{})
		if err != nil {
			c.JSON(500, ErrorResponse{Error: err.Error()})
		} else {
			c.JSON(200, OkResponse{})
		}
	})
}

// SubscriberRoute subscribe to a topic
//
// @Summary subscribe to a topic
// @Description subscribe to a topic
// @Tags openmower
// @Param topic path string true "topic to subscribe to, could be: diagnostics, status, gps, imu, ticks, highLevelStatus"
// @Router /openmower/subscribe/{topic} [get]
func SubscriberRoute(group *gin.RouterGroup, provider types.IRosProvider) {
	group.GET("/subscribe/:topic", func(c *gin.Context) {
		// create a node and connect to the master
		var err error
		topic := c.Param("topic")
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}
		defer conn.Close()
		/*
		   this is where we handle the request context
		*/
		// create a subscriber
		var def func()
		switch topic {
		case "diagnostics":
			def, err = subscribe(provider, c, conn, "/diagnostics", -1)
		case "status":
			def, err = subscribe(provider, c, conn, "/mower/status", -1)
		case "highLevelStatus":
			def, err = subscribe(provider, c, conn, "/mower_logic/current_state", -1)
		case "gps":
			def, err = subscribe(provider, c, conn, "/xbot_driver_gps/xb_pose", 100)
		case "pose":
			def, err = subscribe(provider, c, conn, "/xbot_positioning/xb_pose", 100)
		case "imu":
			def, err = subscribe(provider, c, conn, "/imu/data_raw", 100)
		case "ticks":
			def, err = subscribe(provider, c, conn, "/mower/wheel_ticks", 100)
		case "map":
			def, err = subscribe(provider, c, conn, "/xbot_monitoring/map", -1)
		case "path":
			def, err = subscribe(provider, c, conn, "/slic3r_coverage_planner/path_marker_array", -1)
		case "plan":
			def, err = subscribe(provider, c, conn, "/move_base_flex/FTCPlanner/global_plan", -1)
		case "mowingPath":
			def, err = subscribe(provider, c, conn, "/mowing_path", -1)
		}
		if err != nil {
			log.Println(err.Error())
			return
		}
		defer def()
		/*
		   send log lines to channel
		*/
		_, _, err = conn.ReadMessage()
		if err != nil {
			c.Error(err)
			return
		}
	})
}

// PublisherRoute publish to a topic
//
// @Summary publish to a topic
// @Description publish to a topic
// @Tags openmower
// @Param topic path string true "topic to publish to, could be: joy"
// @Router /openmower/publish/{topic} [get]
func PublisherRoute(group *gin.RouterGroup, provider types.IRosProvider) {
	group.GET("/publish/:topic", func(c *gin.Context) {
		// create a node and connect to the master
		var err error
		conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			return
		}
		defer conn.Close()
		// Read messages from the websocket connection and publish them to ROS
		publisher, err := provider.Publisher("/joy_vel", &geometry_msgs.Twist{})
		if err != nil {
			c.Error(err)
			return
		}
		defer publisher.Close()
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				c.Error(err)
				break
			}
			var msgObj geometry_msgs.Twist
			err = json.Unmarshal(msg, &msgObj)
			if err != nil {
				c.Error(err)
				break
			}
			publisher.Write(&msgObj)
		}
	})
}

func subscribe(provider types.IRosProvider, c *gin.Context, conn *websocket.Conn, topic string, interval int) (func(), error) {
	id := uuid.Generate()
	uidString := id.String()
	err := provider.Subscribe(topic, uidString, func(msg []byte) {
		if interval > 0 {
			time.Sleep(time.Duration(interval) * time.Millisecond)
		}
		writer, err := conn.NextWriter(websocket.TextMessage)
		if err != nil {
			c.Error(err)
			return
		}
		_, err = writer.Write([]byte(base64.StdEncoding.EncodeToString(msg)))
		if err != nil {
			c.Error(err)
			return
		}
		err = writer.Close()
		if err != nil {
			c.Error(err)
			return
		}
	},
	)
	if err != nil {
		return nil, err
	}
	return func() {
		provider.UnSubscribe(topic, uidString)
	}, nil
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
		var err error
		switch command {
		case "high_level_control":
			var CallReq mower_msgs.HighLevelControlSrvReq
			err = c.BindJSON(&CallReq)
			if err != nil {
				return
			}
			err = provider.CallService(c.Request.Context(), "/mower_service/high_level_control", &mower_msgs.HighLevelControlSrv{}, &CallReq, &mower_msgs.HighLevelControlSrvRes{})
		case "emergency":
			var CallReq mower_msgs.EmergencyStopSrvReq
			err = c.BindJSON(&CallReq)
			if err != nil {
				return
			}
			err = provider.CallService(c.Request.Context(), "/mower_service/emergency", &mower_msgs.EmergencyStopSrv{}, &CallReq, &mower_msgs.EmergencyStopSrvRes{})
		case "mower_logic":
			var CallReq dynamic_reconfigure.ReconfigureReq
			err = c.BindJSON(&CallReq)
			if err != nil {
				return
			}
			err = provider.CallService(c.Request.Context(), "/mower_logic/set_parameters", &dynamic_reconfigure.Reconfigure{}, &CallReq, &dynamic_reconfigure.ReconfigureRes{})
		case "mow_enabled":
			var CallReq mower_msgs.MowerControlSrvReq
			err = c.BindJSON(&CallReq)
			if err != nil {
				return
			}
			err = provider.CallService(c.Request.Context(), "/mower_service/mow_enabled", &mower_msgs.MowerControlSrv{}, &CallReq, &mower_msgs.MowerControlSrvRes{})
		case "start_in_area":
			var CallReq mower_msgs.StartInAreaSrvReq
			err = c.BindJSON(&CallReq)
			if err != nil {
				return
			}
			err = provider.CallService(c.Request.Context(), "/mower_service/start_in_area", &mower_msgs.StartInAreaSrv{}, &CallReq, &mower_msgs.StartInAreaSrvRes{})
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
