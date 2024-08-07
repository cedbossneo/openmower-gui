//autogenerated:yes
//nolint:revive,lll
package mower_msgs

import (
	"github.com/bluenviron/goroslib/v2/pkg/msg"
)

const (
	HighLevelStatus_HIGH_LEVEL_STATE_NULL       uint8 = 0
	HighLevelStatus_HIGH_LEVEL_STATE_IDLE       uint8 = 1
	HighLevelStatus_HIGH_LEVEL_STATE_AUTONOMOUS uint8 = 2
	HighLevelStatus_HIGH_LEVEL_STATE_RECORDING  uint8 = 3
	HighLevelStatus_SUBSTATE_1                  uint8 = 0
	HighLevelStatus_SUBSTATE_2                  uint8 = 1
	HighLevelStatus_SUBSTATE_3                  uint8 = 2
	HighLevelStatus_SUBSTATE_4                  uint8 = 3
	HighLevelStatus_SUBSTATE_SHIFT              uint8 = 6
)

type HighLevelStatus struct {
	msg.Package       `ros:"mower_msgs"`
	msg.Definitions   `ros:"uint8 HIGH_LEVEL_STATE_NULL=0,uint8 HIGH_LEVEL_STATE_IDLE=1,uint8 HIGH_LEVEL_STATE_AUTONOMOUS=2,uint8 HIGH_LEVEL_STATE_RECORDING=3,uint8 SUBSTATE_1=0,uint8 SUBSTATE_2=1,uint8 SUBSTATE_3=2,uint8 SUBSTATE_4=3,uint8 SUBSTATE_SHIFT=6"`
	State             uint8
	StateName         string
	SubStateName      string
	CurrentArea       int16
	CurrentPath       int16
	CurrentPathIndex  int16
	GpsQualityPercent float32
	BatteryPercent    float32
	IsCharging        bool
	Emergency         bool
}
