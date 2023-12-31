//autogenerated:yes
//nolint:revive,lll
package mower_msgs

import (
	"github.com/bluenviron/goroslib/v2/pkg/msg"
)

type EmergencyStopSrvReq struct {
	msg.Package `ros:"mower_msgs"`
	Emergency   uint8
}

type EmergencyStopSrvRes struct {
	msg.Package `ros:"mower_msgs"`
}

type EmergencyStopSrv struct {
	msg.Package `ros:"mower_msgs"`
	EmergencyStopSrvReq
	EmergencyStopSrvRes
}
