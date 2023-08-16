package providers

import (
	"context"
	"github.com/brutella/hap"
	"github.com/brutella/hap/accessory"
	log2 "github.com/brutella/hap/log"
	"github.com/cedbossneo/openmower-gui/pkg/msgs/mower_msgs"
	types2 "github.com/cedbossneo/openmower-gui/pkg/types"
	"log"
	"os"
	"os/signal"
	"syscall"
)

type HomeKitProvider struct {
	rosProvider types2.IRosProvider
	mower       *accessory.Switch
}

func NewHomeKitProvider(rosProvider types2.IRosProvider) *HomeKitProvider {
	h := &HomeKitProvider{}
	h.rosProvider = rosProvider
	h.Init()
	return h
}

func (hc *HomeKitProvider) Init() {
	// Create the switch accessory.
	as := hc.registerAccessories()
	hc.subscribeToRos()
	hc.launchServer(as)
}

func (hc *HomeKitProvider) registerAccessories() *accessory.A {
	hc.mower = accessory.NewSwitch(accessory.Info{Name: "OpenMower"})
	hc.mower.Switch.On.OnValueRemoteUpdate(func(on bool) {
		var err error
		if on {
			err = hc.rosProvider.CallService(context.Background(), "/mower_service/high_level_control", &mower_msgs.HighLevelControlSrv{}, &mower_msgs.HighLevelControlSrvReq{
				Command: 1,
			}, &mower_msgs.HighLevelControlSrvRes{})
		} else {
			err = hc.rosProvider.CallService(context.Background(), "/mower_service/high_level_control", &mower_msgs.HighLevelControlSrv{}, &mower_msgs.HighLevelControlSrvReq{
				Command: 2,
			}, &mower_msgs.HighLevelControlSrvRes{})
		}
		if err != nil {
			log.Println(err)
		}
	})
	return hc.mower.A
}

func (hc *HomeKitProvider) launchServer(as *accessory.A) {
	// Store the data in the "./db" directory.
	fs := hap.NewFsStore("./db")
	log2.Debug.Enable()
	// Create the hap server.
	server, err := hap.NewServer(fs, as)
	server.Addr = ":8000"
	if err != nil {
		// stop if an error happens
		log.Panic(err)
	}

	// Setup a listener for interrupts and SIGTERM signals
	// to stop the server.
	c := make(chan os.Signal)
	signal.Notify(c, os.Interrupt)
	signal.Notify(c, syscall.SIGTERM)

	ctx, cancel := context.WithCancel(context.Background())
	go func() {
		<-c
		// Stop delivering signals.
		signal.Stop(c)
		// Cancel the context to stop the server.
		cancel()
	}()

	go func() {
		// Run the server.
		server.ListenAndServe(ctx)
	}()

}

func (hc *HomeKitProvider) subscribeToRos() {
	hc.rosProvider.Subscribe("/mower_logic/current_state", "ha-status", func(msg any) {
		status := msg.(*mower_msgs.HighLevelStatus)
		if status.State == mower_msgs.HighLevelStatus_HIGH_LEVEL_STATE_AUTONOMOUS {
			hc.mower.Switch.On.SetValue(true)
		} else {
			hc.mower.Switch.On.SetValue(false)
		}
	})
}
