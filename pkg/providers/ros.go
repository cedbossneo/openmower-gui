package providers

import (
	"context"
	"github.com/bluenviron/goroslib/v2"
	"github.com/bluenviron/goroslib/v2/pkg/msgs/geometry_msgs"
	"github.com/bluenviron/goroslib/v2/pkg/msgs/nav_msgs"
	"github.com/bluenviron/goroslib/v2/pkg/msgs/sensor_msgs"
	"github.com/bluenviron/goroslib/v2/pkg/msgs/visualization_msgs"
	"github.com/cedbossneo/openmower-gui/pkg/msgs/mower_msgs"
	"github.com/cedbossneo/openmower-gui/pkg/msgs/xbot_msgs"
	types2 "github.com/cedbossneo/openmower-gui/pkg/types"
	"github.com/sirupsen/logrus"
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
	pathSubscriber            *goroslib.Subscriber
	currentPathSubscriber     *goroslib.Subscriber
	subscribers               map[string]map[string]func(msg any)
	lastMessage               map[string]any
	mowingPaths               []*nav_msgs.Path
	mowingPath                *nav_msgs.Path
}

func (p *RosProvider) getNode() (*goroslib.Node, error) {
	var err error
	p.mtx.Lock()
	defer p.mtx.Unlock()
	if p.node != nil {
		return p.node, err
	}

	nodeName := os.Getenv("ROS_NODE_NAME")
	if nodeName == "" {
		nodeName = "openmower-gui"
	}

	p.node, err = goroslib.NewNode(goroslib.NodeConf{
		Name:          nodeName,
		MasterAddress: os.Getenv("ROS_MASTER_URI"),
		Host:          os.Getenv("ROS_NODE_HOST"),
	})
	return p.node, err

}

func NewRosProvider() types2.IRosProvider {
	r := &RosProvider{}
	err := r.initSubscribers()
	if err != nil {
		logrus.Error(err)
		return r
	}
	err = r.Subscribe("/xbot_positioning/xb_pose", "gui", func(msg any) {
		pose := msg.(*xbot_msgs.AbsolutePose)
		hlsLastMessage, ok := r.lastMessage["/mower_logic/current_state"]
		if ok {
			highLevelStatus := hlsLastMessage.(*mower_msgs.HighLevelStatus)
			switch highLevelStatus.StateName {
			case "MOWING":
				sLastMessage, ok := r.lastMessage["/mower/status"]
				if ok {
					status := sLastMessage.(*mower_msgs.Status)
					if status.MowEscStatus.Tacho > 0 {
						if r.mowingPath == nil {
							r.mowingPath = &nav_msgs.Path{}
							r.mowingPaths = append(r.mowingPaths, r.mowingPath)
						}
						// Compute distance between last point and the new one
						if len(r.mowingPath.Poses) > 0 {
							lastPose := r.mowingPath.Poses[len(r.mowingPath.Poses)-1]
							distance := (pose.Pose.Pose.Position.X-lastPose.Pose.Position.X)*(pose.Pose.Pose.Position.X-lastPose.Pose.Position.X) + (pose.Pose.Pose.Position.Y-lastPose.Pose.Position.Y)*(pose.Pose.Pose.Position.Y-lastPose.Pose.Position.Y)
							if distance > 0.30 {
								r.mowingPath.Poses = append(r.mowingPath.Poses, geometry_msgs.PoseStamped{
									Pose: pose.Pose.Pose,
								})
							}
						} else {
							r.mowingPath.Poses = append(r.mowingPath.Poses, geometry_msgs.PoseStamped{
								Pose: pose.Pose.Pose,
							})
						}
						r.lastMessage["/mowing_path"] = r.mowingPaths
						subscribers, hasSubscriber := r.subscribers["/mowing_path"]
						if hasSubscriber {
							for _, cb := range subscribers {
								cb(r.mowingPaths)
							}
						}
					} else {
						r.mowingPath = nil
					}
				}
				break
			default:
				r.mowingPaths = []*nav_msgs.Path{}
			}
		}
	})
	if err != nil {
		logrus.Error(err)
	}
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
	err := p.initSubscribers()
	if err != nil {
		return err
	}
	p.mtx.Lock()
	defer p.mtx.Unlock()
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

func (p *RosProvider) Publisher(topic string, obj interface{}) (*goroslib.Publisher, error) {
	rosNode, err := p.getNode()
	if err != nil {
		return nil, err
	}
	publisher, err := goroslib.NewPublisher(goroslib.PublisherConf{
		Node:  rosNode,
		Topic: topic,
		Msg:   obj,
	})
	return publisher, nil
}

func (p *RosProvider) UnSubscribe(topic string, id string) {
	p.mtx.Lock()
	defer p.mtx.Unlock()
	delete(p.subscribers[topic], id)
}

func (p *RosProvider) initSubscribers() error {
	node, err := p.getNode()
	if err != nil {
		return err
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
			Callback: cbHandler[*mower_msgs.Status](p, "/mower/status"),
		})
	}
	if p.highLevelStatusSubscriber == nil {
		p.highLevelStatusSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:     node,
			Topic:    "/mower_logic/current_state",
			Callback: cbHandler[*mower_msgs.HighLevelStatus](p, "/mower_logic/current_state"),
		})
	}
	if p.gpsSubscriber == nil {
		p.gpsSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:     node,
			Topic:    "/xbot_positioning/xb_pose",
			Callback: cbHandler[*xbot_msgs.AbsolutePose](p, "/xbot_positioning/xb_pose"),
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
			Callback: cbHandler[*xbot_msgs.WheelTick](p, "/mower/wheel_ticks"),
		})
	}
	if p.mapSubscriber == nil {
		p.mapSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:     node,
			Topic:    "/xbot_monitoring/map",
			Callback: cbHandler[*xbot_msgs.Map](p, "/xbot_monitoring/map"),
		})
	}
	if p.pathSubscriber == nil {
		p.pathSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:     node,
			Topic:    "/slic3r_coverage_planner/path_marker_array",
			Callback: cbHandler[*visualization_msgs.MarkerArray](p, "/slic3r_coverage_planner/path_marker_array"),
		})
	}
	if p.currentPathSubscriber == nil {
		p.currentPathSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:     node,
			Topic:    "/move_base_flex/FTCPlanner/global_plan",
			Callback: cbHandler[*nav_msgs.Path](p, "/move_base_flex/FTCPlanner/global_plan"),
		})
	}
	return nil
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
