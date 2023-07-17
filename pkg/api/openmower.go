package api

import (
	"context"
	"errors"
	"github.com/bluenviron/goroslib/v2"
	"github.com/gin-gonic/gin"
	"mowgli-gui/pkg/msgs"
	"os"
)

func OpenMowerRoutes(r *gin.RouterGroup) {
	group := r.Group("/openmower")
	ServiceRoute(group)
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
