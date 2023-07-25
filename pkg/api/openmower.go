package api

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"github.com/docker/distribution/uuid"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"log"
	"mowgli-gui/pkg/msgs"
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
	MapRoute(group, provider)
	SubscriberRoute(group, provider)
}

func MapRoute(group *gin.RouterGroup, provider types.IRosProvider) {

}

// SubscriberRoute subscribe to a topic
//
// @Summary subscribe to a topic
// @Description subscribe to a topic
// @Tags openmower
// @Produce  text/event-stream
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
		err = conn.WriteMessage(websocket.TextMessage, []byte(base64.StdEncoding.EncodeToString(str)))
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
