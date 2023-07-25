package providers

import (
	"context"
	"github.com/bluenviron/goroslib/v2"
	"github.com/bluenviron/goroslib/v2/pkg/msgs/sensor_msgs"
	"mowgli-gui/pkg/msgs"
	types2 "mowgli-gui/pkg/types"
	"os"
	"sync"
)

type RosProvider struct {
	node                      *goroslib.Node
	mtx                       sync.Mutex
	statusSubscriber          *goroslib.Subscriber
	highLevelStatusSubscriber *goroslib.Subscriber
	gpsSubscriber             *goroslib.Subscriber
	imuSubscriber             *goroslib.Subscriber
	ticksSubscriber           *goroslib.Subscriber
	mapSubscriber             *goroslib.Subscriber
	subscribers               map[string]map[string]func(msg any)
	lastMessage               map[string]any
}

func (p *RosProvider) getNode() (*goroslib.Node, error) {
	var err error
	p.mtx.Lock()
	defer p.mtx.Unlock()
	if p.node != nil {
		return p.node, err
	}
	p.node, err = goroslib.NewNode(goroslib.NodeConf{
		Name:          "goroslib",
		MasterAddress: os.Getenv("ROS_MASTER_URI"),
	})
	return p.node, err

}

func NewRosProvider() types2.IRosProvider {
	r := &RosProvider{}
	r.initSubscribers()
	return r
}

func (p *RosProvider) CallService(ctx context.Context, srvName string, srv any, req any, res any) error {
	rosNode, err := p.getNode()
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

func (p *RosProvider) Subscribe(topic string, id string, cb func(msg any)) error {
	p.initSubscribers()
	subscriber, hasSubscriber := p.subscribers[topic]
	if !hasSubscriber {
		p.subscribers[topic] = make(map[string]func(msg any))
		subscriber, _ = p.subscribers[topic]
	}
	_, hasCallback := subscriber[id]
	if !hasCallback {
		subscriber[id] = cb
	}
	lastMessage, hasLastMessage := p.lastMessage[topic]
	if hasLastMessage {
		cb(lastMessage)
	}
	return nil
}

func (p *RosProvider) UnSubscribe(topic string, id string) {
	p.mtx.Lock()
	defer p.mtx.Unlock()
	delete(p.subscribers[topic], id)
}

func (p *RosProvider) initSubscribers() {
	node, err := p.getNode()
	if err != nil {
		return
	}
	if p.subscribers == nil {
		p.subscribers = make(map[string]map[string]func(msg any))
	}
	if p.lastMessage == nil {
		p.lastMessage = make(map[string]any)
	}
	if p.statusSubscriber == nil {
		p.statusSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:     node,
			Topic:    "/mower/status",
			Callback: cbHandler[*msgs.Status](p, "/mower/status"),
		})
	}
	if p.highLevelStatusSubscriber == nil {
		p.highLevelStatusSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:     node,
			Topic:    "/mower_logic/current_state",
			Callback: cbHandler[*msgs.HighLevelStatus](p, "/mower_logic/current_state"),
		})
	}
	if p.gpsSubscriber == nil {
		p.gpsSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:     node,
			Topic:    "/xbot_positioning/xb_pose",
			Callback: cbHandler[*msgs.AbsolutePose](p, "/xbot_positioning/xb_pose"),
		})
	}
	if p.imuSubscriber == nil {
		p.imuSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:     node,
			Topic:    "/imu/data_raw",
			Callback: cbHandler[*sensor_msgs.Imu](p, "/imu/data_raw"),
		})
	}
	if p.ticksSubscriber == nil {
		p.ticksSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:     node,
			Topic:    "/mower/wheel_ticks",
			Callback: cbHandler[*msgs.WheelTick](p, "/mower/wheel_ticks"),
		})
	}
	if p.mapSubscriber == nil {
		p.mapSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:     node,
			Topic:    "/xbot_monitoring/map",
			Callback: cbHandler[*msgs.Map](p, "/xbot_monitoring/map"),
		})
	}
}

func cbHandler[T any](p *RosProvider, topic string) func(msg T) {
	return func(msg T) {
		p.mtx.Lock()
		defer p.mtx.Unlock()
		p.lastMessage[topic] = msg
		subscribers, hasSubscriber := p.subscribers[topic]
		if hasSubscriber {
			for _, cb := range subscribers {
				cb(msg)
			}
		}
	}
}
