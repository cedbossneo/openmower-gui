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
	"github.com/paulmach/orb"
	"github.com/paulmach/orb/simplify"
	"github.com/samber/lo"
	"github.com/sirupsen/logrus"
	"golang.org/x/xerrors"
	"os"
	"sync"
	"time"
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
	poseSubscriber            *goroslib.Subscriber
	subscribers               map[string]map[string]func(msg any)
	subscribersBusy           map[string]map[string]*sync.Mutex
	lastMessage               map[string]any
	mowingPaths               []*nav_msgs.Path
	mowingPath                *nav_msgs.Path
	mowingPathOrigin          orb.LineString
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
	err = r.initMowingPathSubscriber()
	if err != nil {
		logrus.Error(err)
		return r
	}
	go func() {
		for range time.Tick(20 * time.Second) {
			node, err := r.getNode()
			if err != nil {
				logrus.Error(xerrors.Errorf("failed to get node: %w", err))
				continue
			}
			_, err = node.NodePing("rosout")
			if err != nil {
				logrus.Error(xerrors.Errorf("failed to ping node: %w, restarting node", err))
				r.resetSubscribers()
			} else {
				err = r.initSubscribers()
				if err != nil {
					logrus.Error(xerrors.Errorf("failed to init subscribers: %w", err))
				}
			}
		}
	}()
	return r
}

func (p *RosProvider) resetSubscribers() {
	if p.node != nil {
		p.node.Close()
	}
	p.node = nil
	p.currentPathSubscriber = nil
	p.gpsSubscriber = nil
	p.highLevelStatusSubscriber = nil
	p.imuSubscriber = nil
	p.mapSubscriber = nil
	p.pathSubscriber = nil
	p.statusSubscriber = nil
	p.ticksSubscriber = nil
	p.poseSubscriber = nil
}

func (p *RosProvider) initMowingPathSubscriber() error {
	err := p.Subscribe("/xbot_positioning/xb_pose", "gui", func(msg any) {
		pose := msg.(*xbot_msgs.AbsolutePose)
		hlsLastMessage, ok := p.lastMessage["/mower_logic/current_state"]
		if ok {
			highLevelStatus := hlsLastMessage.(*mower_msgs.HighLevelStatus)
			switch highLevelStatus.StateName {
			case "MOWING":
				sLastMessage, ok := p.lastMessage["/mower/status"]
				if ok {
					status := sLastMessage.(*mower_msgs.Status)
					if status.MowEscStatus.Tacho > 0 {
						if p.mowingPath == nil {
							p.mowingPath = &nav_msgs.Path{}
							p.mowingPathOrigin = orb.LineString{}
							p.mowingPaths = append(p.mowingPaths, p.mowingPath)
						}
						p.mowingPathOrigin = append(p.mowingPathOrigin, orb.Point{
							pose.Pose.Pose.Position.X, pose.Pose.Pose.Position.Y,
						})
						if len(p.mowingPathOrigin)%5 == 0 {
							// low threshold just removes the colinear point
							reduced := simplify.DouglasPeucker(0.03).LineString(p.mowingPathOrigin.Clone())
							p.mowingPath.Poses = lo.Map(reduced, func(p orb.Point, idx int) geometry_msgs.PoseStamped {
								return geometry_msgs.PoseStamped{
									Pose: geometry_msgs.Pose{
										Position: geometry_msgs.Point{
											X: p[0],
											Y: p[1],
										},
									},
								}
							})
						}
						p.lastMessage["/mowing_path"] = p.mowingPaths
						subscribers, hasSubscriber := p.subscribers["/mowing_path"]
						if hasSubscriber {
							for id, cb := range subscribers {
								if p.subscribersBusy["/mowing_path"][id].TryLock() {
									go func(topic, id string, subCb func(msg any)) {
										subCb(msg)
										p.subscribersBusy[topic][id].Unlock()
									}("/mowing_path", id, cb)
								}
							}
						}
					} else {
						p.mowingPath = nil
						p.mowingPathOrigin = nil
					}
				}
				break
			default:
				p.mowingPaths = []*nav_msgs.Path{}
				p.mowingPath = nil
				p.mowingPathOrigin = nil
			}
		}
	})
	return err
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
		p.subscribersBusy[topic] = make(map[string]*sync.Mutex)
		subscriber, _ = p.subscribers[topic]
	}
	_, hasCallback := subscriber[id]
	if !hasCallback {
		subscriber[id] = cb
		p.subscribersBusy[topic][id] = &sync.Mutex{}
	}
	lastMessage, hasLastMessage := p.lastMessage[topic]
	if hasLastMessage {
		p.subscribersBusy[topic][id].Lock()
		cb(lastMessage)
		p.subscribersBusy[topic][id].Unlock()
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
	delete(p.subscribersBusy[topic], id)
}

func (p *RosProvider) initSubscribers() error {
	node, err := p.getNode()
	if err != nil {
		return err
	}
	if p.subscribers == nil {
		p.subscribers = make(map[string]map[string]func(msg any))
	}
	if p.subscribersBusy == nil {
		p.subscribersBusy = make(map[string]map[string]*sync.Mutex)
	}
	if p.lastMessage == nil {
		p.lastMessage = make(map[string]any)
	}
	if p.statusSubscriber == nil {
		p.statusSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:      node,
			Topic:     "/mower/status",
			Callback:  cbHandler[*mower_msgs.Status](p, "/mower/status"),
			QueueSize: 1,
		})
		logrus.Info("Subscribed to /mower/status")
	}
	if p.highLevelStatusSubscriber == nil {
		p.highLevelStatusSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:      node,
			Topic:     "/mower_logic/current_state",
			Callback:  cbHandler[*mower_msgs.HighLevelStatus](p, "/mower_logic/current_state"),
			QueueSize: 1,
		})
		logrus.Info("Subscribed to /mower_logic/current_state")
	}
	if p.gpsSubscriber == nil {
		p.gpsSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:      node,
			Topic:     "/xbot_driver_gps/xb_pose",
			Callback:  cbHandler[*xbot_msgs.AbsolutePose](p, "/xbot_driver_gps/xb_pose"),
			QueueSize: 1,
		})
		logrus.Info("Subscribed to /xbot_driver_gps/xb_pose")
	}
	if p.poseSubscriber == nil {
		p.poseSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:      node,
			Topic:     "/xbot_positioning/xb_pose",
			Callback:  cbHandler[*xbot_msgs.AbsolutePose](p, "/xbot_positioning/xb_pose"),
			QueueSize: 1,
		})
		logrus.Info("Subscribed to /xbot_positioning/xb_pose")
	}
	if p.imuSubscriber == nil {
		p.imuSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:      node,
			Topic:     "/imu/data_raw",
			Callback:  cbHandler[*sensor_msgs.Imu](p, "/imu/data_raw"),
			QueueSize: 1,
		})
		logrus.Info("Subscribed to /imu/data_raw")
	}
	if p.ticksSubscriber == nil {
		p.ticksSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:      node,
			Topic:     "/mower/wheel_ticks",
			Callback:  cbHandler[*xbot_msgs.WheelTick](p, "/mower/wheel_ticks"),
			QueueSize: 1,
		})
		logrus.Info("Subscribed to /mower/wheel_ticks")
	}
	if p.mapSubscriber == nil {
		p.mapSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:      node,
			Topic:     "/xbot_monitoring/map",
			Callback:  cbHandler[*xbot_msgs.Map](p, "/xbot_monitoring/map"),
			QueueSize: 1,
		})
		logrus.Info("Subscribed to /xbot_monitoring/map")
	}
	if p.pathSubscriber == nil {
		p.pathSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:      node,
			Topic:     "/slic3r_coverage_planner/path_marker_array",
			Callback:  cbHandler[*visualization_msgs.MarkerArray](p, "/slic3r_coverage_planner/path_marker_array"),
			QueueSize: 1,
		})
		logrus.Info("Subscribed to /slic3r_coverage_planner/path_marker_array")
	}
	if p.currentPathSubscriber == nil {
		p.currentPathSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:      node,
			Topic:     "/move_base_flex/FTCPlanner/global_plan",
			Callback:  cbHandler[*nav_msgs.Path](p, "/move_base_flex/FTCPlanner/global_plan"),
			QueueSize: 1,
		})
		logrus.Info("Subscribed to /move_base_flex/FTCPlanner/global_plan")
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
			for id, cb := range subscribers {
				if p.subscribersBusy[topic][id].TryLock() {
					go func(topic, id string, subCb func(msg any)) {
						subCb(msg)
						p.subscribersBusy[topic][id].Unlock()
					}(topic, id, cb)
				}
			}
		}
	}
}
