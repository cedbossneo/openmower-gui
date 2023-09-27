package providers

import (
	"context"
	"encoding/json"
	"github.com/brutella/hap/accessory"
	"github.com/cedbossneo/openmower-gui/pkg/msgs/dynamic_reconfigure"
	"github.com/cedbossneo/openmower-gui/pkg/msgs/mower_msgs"
	types2 "github.com/cedbossneo/openmower-gui/pkg/types"
	mqtt "github.com/mochi-mqtt/server/v2"
	"github.com/mochi-mqtt/server/v2/hooks/auth"
	"github.com/mochi-mqtt/server/v2/listeners"
	"github.com/mochi-mqtt/server/v2/packets"
	"github.com/sirupsen/logrus"
	"golang.org/x/xerrors"
	"reflect"

	"log"
	"os"
	"os/signal"
	"syscall"
)

type MqttProvider struct {
	rosProvider types2.IRosProvider
	mower       *accessory.Switch
	server      *mqtt.Server
}

func NewMqttProvider(rosProvider types2.IRosProvider) *MqttProvider {
	h := &MqttProvider{}
	h.rosProvider = rosProvider
	h.Init()
	return h
}

func (hc *MqttProvider) Init() {
	// Create the switch accessory.
	hc.launchServer()
	hc.subscribeToRos()
	hc.subscribeToMqtt()
}

func (hc *MqttProvider) launchServer() {
	// Create signals channel to run server until interrupted
	sigs := make(chan os.Signal, 1)
	done := make(chan bool, 1)
	signal.Notify(sigs, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		<-sigs
		done <- true
	}()

	// Create the new MQTT Server.
	hc.server = mqtt.New(&mqtt.Options{
		InlineClient: true,
	})

	// Allow all connections.
	_ = hc.server.AddHook(new(auth.AllowHook), nil)

	// Create a TCP listener on a standard port.
	tcp := listeners.NewTCP("t1", ":1883", nil)
	err := hc.server.AddListener(tcp)
	if err != nil {
		log.Fatal(err)
	}

	go func() {
		err := hc.server.Serve()
		if err != nil {
			log.Fatal(err)
		}
	}()
}

func (hc *MqttProvider) subscribeToRos() {
	hc.subscribeToRosTopic("/mower_logic/current_state", "mqtt-mower-logic")
	hc.subscribeToRosTopic("/mower/status", "mqtt-mower-status")
	hc.subscribeToRosTopic("/xbot_positioning/xb_pose", "mqtt-gps")
	hc.subscribeToRosTopic("/imu/data_raw", "mqtt-imu")
	hc.subscribeToRosTopic("/mower/wheel_ticks", "mqtt-ticks")
	hc.subscribeToRosTopic("/xbot_monitoring/map", "mqtt-map")
	hc.subscribeToRosTopic("/slic3r_coverage_planner/path_marker_array", "mqtt-path")
	hc.subscribeToRosTopic("/move_base_flex/FTCPlanner/global_plan", "mqtt-plan")
	hc.subscribeToRosTopic("/mowing_path", "mqtt-mowing-path")
}

func (hc *MqttProvider) subscribeToRosTopic(topic string, id string) {
	err := hc.rosProvider.Subscribe(topic, id, func(msg any) {
		msgJson, _ := json.Marshal(msg)
		err := hc.server.Publish(topic, msgJson, true, 0)
		if err != nil {
			logrus.Error(xerrors.Errorf("Failed to publish to %s: %w", topic, err))
		}
	})
	if err != nil {
		logrus.Error(xerrors.Errorf("Failed to subscribe to %s: %w", topic, err))
	}
}

func (hc *MqttProvider) subscribeToMqtt() {
	subscribeToMqttCall(hc.server, hc.rosProvider, "/mower_service/high_level_control", &mower_msgs.HighLevelControlSrv{}, &mower_msgs.HighLevelControlSrvReq{}, &mower_msgs.HighLevelControlSrvRes{})
	subscribeToMqttCall(hc.server, hc.rosProvider, "/mower_service/emergency", &mower_msgs.EmergencyStopSrv{}, &mower_msgs.EmergencyStopSrvReq{}, &mower_msgs.EmergencyStopSrvRes{})
	subscribeToMqttCall(hc.server, hc.rosProvider, "/mower_logic/set_parameters", &dynamic_reconfigure.Reconfigure{}, &dynamic_reconfigure.ReconfigureReq{}, &dynamic_reconfigure.ReconfigureRes{})
	subscribeToMqttCall(hc.server, hc.rosProvider, "/mower_service/mow_enabled", &mower_msgs.MowerControlSrv{}, &mower_msgs.MowerControlSrvReq{}, &mower_msgs.MowerControlSrvRes{})
	subscribeToMqttCall(hc.server, hc.rosProvider, "/mower_service/start_in_area", &mower_msgs.StartInAreaSrv{}, &mower_msgs.StartInAreaSrvReq{}, &mower_msgs.StartInAreaSrvRes{})
}

func subscribeToMqttCall[SRV any, REQ any, RES any](server *mqtt.Server, rosProvider types2.IRosProvider, topic string, srv SRV, req REQ, res RES) {
	err := server.Subscribe("call"+topic, 1, func(cl *mqtt.Client, sub packets.Subscription, pk packets.Packet) {
		logrus.Info("Received " + topic)
		var newReq = reflect.New(reflect.TypeOf(req).Elem()).Interface()
		err := json.Unmarshal(pk.Payload, newReq)
		if err != nil {
			logrus.Error(xerrors.Errorf("Failed to unmarshal %s: %w", topic, err))
			return
		}
		err = rosProvider.CallService(context.Background(), topic, srv, newReq, res)
		if err != nil {
			logrus.Error(xerrors.Errorf("Failed to call %s: %w", topic, err))
		}
	})
	if err != nil {
		logrus.Error(xerrors.Errorf("Failed to subscribe to %s: %w", topic, err))
	}
}
