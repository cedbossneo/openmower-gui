package api

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"github.com/docker/distribution/uuid"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"log"
	"mowgli-gui/pkg/msgs/mower_map"
	"mowgli-gui/pkg/msgs/mower_msgs"
	"mowgli-gui/pkg/types"
	"net/http"
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
			def, err = subscribe(provider, c, conn, "/diagnostics")
		case "status":
			def, err = subscribe(provider, c, conn, "/mower/status")
		case "highLevelStatus":
			def, err = subscribe(provider, c, conn, "/mower_logic/current_state")
		case "gps":
			def, err = subscribe(provider, c, conn, "/xbot_positioning/xb_pose")
		case "imu":
			def, err = subscribe(provider, c, conn, "/imu/data_raw")
		case "ticks":
			def, err = subscribe(provider, c, conn, "/mower/wheel_ticks")
		case "map":
			def, err = subscribe(provider, c, conn, "/xbot_monitoring/map")
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

func subscribe(provider types.IRosProvider, c *gin.Context, conn *websocket.Conn, topic string) (func(), error) {
	id := uuid.Generate()
	uidString := id.String()
	err := provider.Subscribe(topic, uidString, func(msg any) {
		// read lines from the reader
		str, err := json.Marshal(msg)
		if err != nil {
			log.Println("Read Error:", err.Error())
			c.Error(err)
			return
		}
		writer, err := conn.NextWriter(websocket.TextMessage)
		if err != nil {
			c.Error(err)
			return
		}
		_, err = writer.Write([]byte(base64.StdEncoding.EncodeToString(str)))
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
		var CallReq map[string]interface{}
		err := c.BindJSON(&CallReq)
		if err != nil {
			return
		}
		switch command {
		case "mower_start":
			err = provider.CallService(c.Request.Context(), "/mower_service/high_level_control", &mower_msgs.HighLevelControlSrv{}, &mower_msgs.HighLevelControlSrvReq{
				Command: 1,
			}, &mower_msgs.HighLevelControlSrvRes{})
		case "mower_home":
			err = provider.CallService(c.Request.Context(), "/mower_service/high_level_control", &mower_msgs.HighLevelControlSrv{}, &mower_msgs.HighLevelControlSrvReq{
				Command: 2,
			}, &mower_msgs.HighLevelControlSrvRes{})
		case "mower_s1":
			err = provider.CallService(c.Request.Context(), "/mower_service/high_level_control", &mower_msgs.HighLevelControlSrv{}, &mower_msgs.HighLevelControlSrvReq{
				Command: 3,
			}, &mower_msgs.HighLevelControlSrvRes{})
		case "mower_s2":
			err = provider.CallService(c.Request.Context(), "/mower_service/high_level_control", &mower_msgs.HighLevelControlSrv{}, &mower_msgs.HighLevelControlSrvReq{
				Command: 4,
			}, &mower_msgs.HighLevelControlSrvRes{})
		case "emergency":
			err = provider.CallService(c.Request.Context(), "/mower_service/emergency", &mower_msgs.EmergencyStopSrv{}, &mower_msgs.EmergencyStopSrvReq{
				Emergency: uint8(CallReq["emergency"].(float64)),
			}, &mower_msgs.EmergencyStopSrvRes{})
		case "mow":
			err = provider.CallService(c.Request.Context(), "/mower_service/mow_enabled", &mower_msgs.MowerControlSrv{}, &mower_msgs.MowerControlSrvReq{
				MowEnabled:   uint8(CallReq["mow_enabled"].(float64)),
				MowDirection: uint8(CallReq["mow_direction"].(float64)),
			}, &mower_msgs.MowerControlSrvRes{})
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
