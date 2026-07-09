package providers

import (
	"context"
	"encoding/json"
	"github.com/bluenviron/goroslib/v2"
	"github.com/bluenviron/goroslib/v2/pkg/msgs/geometry_msgs"
	"github.com/bluenviron/goroslib/v2/pkg/msgs/nav_msgs"
	"github.com/bluenviron/goroslib/v2/pkg/msgs/sensor_msgs"
	"github.com/bluenviron/goroslib/v2/pkg/msgs/visualization_msgs"
	"github.com/cedbossneo/openmower-gui/pkg/msgs/mower_msgs"
	"github.com/cedbossneo/openmower-gui/pkg/msgs/std_msgs"
	"github.com/cedbossneo/openmower-gui/pkg/msgs/xbot_msgs"
	"math"
	types2 "github.com/cedbossneo/openmower-gui/pkg/types"
	"github.com/paulmach/orb"
	"github.com/paulmach/orb/simplify"
	"github.com/samber/lo"
	"github.com/sirupsen/logrus"
	"golang.org/x/xerrors"
	"sync"
	"time"
)

type RosSubscriber struct {
	Topic       string
	Id          string
	mtx         *sync.Mutex
	cb          func(msg []byte)
	nextMessage []byte
	close       chan bool
}

func NewRosSubscriber(topic, id string, cb func(msg []byte)) *RosSubscriber {
	r := &RosSubscriber{
		cb:    cb,
		Topic: topic,
		Id:    id,
		mtx:   &sync.Mutex{},
		close: make(chan bool),
	}
	go r.Run()
	return r
}

func (r *RosSubscriber) Publish(msg []byte) {
	r.mtx.Lock()
	defer r.mtx.Unlock()
	r.nextMessage = msg
}

func (r *RosSubscriber) Close() {
	r.close <- true
}

func (r *RosSubscriber) Run() {
	for {
		select {
		case <-r.close:
			return
		default:
			r.mtx.Lock()
			messageToProcess := r.nextMessage
			r.nextMessage = nil
			r.mtx.Unlock()
			r.processMessage(messageToProcess)
		}
	}
}

func (r *RosSubscriber) processMessage(messageToProcess []byte) {
	if messageToProcess != nil {
		r.cb(messageToProcess)
	} else {
		time.Sleep(100 * time.Millisecond)
	}
}

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
	powerSubscriber           *goroslib.Subscriber
	emergencySubscriber       *goroslib.Subscriber
	dockingSensorSubscriber   *goroslib.Subscriber
	lidarSubscriber           *goroslib.Subscriber
	subscribers               map[string]map[string]*RosSubscriber
	lastMessage               map[string][]byte
	mowingPaths               []*nav_msgs.Path
	mowingPath                *nav_msgs.Path
	mowingPathOrigin          orb.LineString
	dbProvider                types2.IDBProvider
	// actionPublisher is a long-lived publisher to xbot/action. It is created
	// lazily and reused: a fresh publisher would drop its first message because
	// the TCP link to the mower_logic subscriber is not established yet.
	actionPublisher *goroslib.Publisher
}

func (p *RosProvider) getNode() (*goroslib.Node, error) {
	var err error
	p.mtx.Lock()
	defer p.mtx.Unlock()
	if p.node != nil {
		return p.node, err
	}

	nodeName, err := p.dbProvider.Get("system.ros.nodeName")
	if err != nil {
		return nil, err
	}
	masterUri, err := p.dbProvider.Get("system.ros.masterUri")
	if err != nil {
		return nil, err
	}
	nodeHost, err := p.dbProvider.Get("system.ros.nodeHost")
	if err != nil {
		return nil, err
	}
	p.node, err = goroslib.NewNode(goroslib.NodeConf{
		Name:          string(nodeName),
		MasterAddress: string(masterUri),
		Host:          string(nodeHost),
		ReadTimeout:   time.Minute,
		WriteTimeout:  time.Minute,
	})
	return p.node, err

}

func NewRosProvider(dbProvider types2.IDBProvider) types2.IRosProvider {
	r := &RosProvider{
		dbProvider: dbProvider,
	}
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
				err = r.initMowingPathSubscriber()
				if err != nil {
					logrus.Error(xerrors.Errorf("failed to init mowing path subscriber: %w", err))
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
	p.currentPathSubscriber.Close()
	p.gpsSubscriber.Close()
	p.highLevelStatusSubscriber.Close()
	p.imuSubscriber.Close()
	p.mapSubscriber.Close()
	p.pathSubscriber.Close()
	p.statusSubscriber.Close()
	p.ticksSubscriber.Close()
	p.poseSubscriber.Close()
	if p.powerSubscriber != nil {
		p.powerSubscriber.Close()
	}
	if p.emergencySubscriber != nil {
		p.emergencySubscriber.Close()
	}
	if p.dockingSensorSubscriber != nil {
		p.dockingSensorSubscriber.Close()
	}
	if p.lidarSubscriber != nil {
		p.lidarSubscriber.Close()
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
	p.powerSubscriber = nil
	p.emergencySubscriber = nil
	p.dockingSensorSubscriber = nil
	p.lidarSubscriber = nil
	p.mowingPaths = []*nav_msgs.Path{}
	p.mowingPath = nil
	p.mowingPathOrigin = nil
	xbPose := p.subscribers["/xbot_positioning/xb_pose"]
	if xbPose != nil {
		for _, sub := range xbPose {
			sub.Close()
		}
	}
}

func (p *RosProvider) initMowingPathSubscriber() error {
	err := p.Subscribe("/xbot_positioning/xb_pose", "gui", func(msg []byte) {
		p.mtx.Lock()
		defer p.mtx.Unlock()
		var pose xbot_msgs.AbsolutePose
		err := json.Unmarshal(msg, &pose)
		if err != nil {
			logrus.Error(xerrors.Errorf("failed to unmarshal pose: %w", err))
			return
		}
		hlsLastMessage, ok := p.lastMessage["/mower_logic/current_state"]
		if ok {
			var highLevelStatus mower_msgs.HighLevelStatus
			err := json.Unmarshal(hlsLastMessage, &highLevelStatus)
			if err != nil {
				logrus.Error(xerrors.Errorf("failed to unmarshal high level status: %w", err))
				return
			}
			switch highLevelStatus.StateName {
			case "MOWING":
				sLastMessage, ok := p.lastMessage["/ll/mower_status"]
				if ok {
					var status mower_msgs.Status
					err := json.Unmarshal(sLastMessage, &status)
					if err != nil {
						logrus.Error(xerrors.Errorf("failed to unmarshal status: %w", err))
						return
					}
					if status.MowerMotorRpm > 0 {
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
						msgJson, _ := json.Marshal(p.mowingPaths)
						p.lastMessage["/mowing_path"] = msgJson
						subscribers, hasSubscriber := p.subscribers["/mowing_path"]
						if hasSubscriber {
							for _, cb := range subscribers {
								cb.Publish(msgJson)
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
	if err != nil {
		return err
	}
	defer serviceClient.Close()
	err = serviceClient.CallContext(ctx, req, res)
	if err != nil {
		return err
	}
	return nil
}

func (p *RosProvider) Subscribe(topic string, id string, cb func(msg []byte)) error {
	err := p.initSubscribers()
	if err != nil {
		return err
	}
	p.mtx.Lock()
	defer p.mtx.Unlock()
	subscriber, hasSubscriber := p.subscribers[topic]
	if !hasSubscriber {
		p.subscribers[topic] = make(map[string]*RosSubscriber)
		subscriber, _ = p.subscribers[topic]
	}
	_, hasCallback := subscriber[id]
	if !hasCallback {
		subscriber[id] = NewRosSubscriber(topic, id, cb)
	}
	lastMessage, hasLastMessage := p.lastMessage[topic]
	if hasLastMessage {
		subscriber[id].Publish(lastMessage)
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

// PublishAction publishes an action string to xbot/action (std_msgs/String),
// which mower_logic forwards to the currently active behavior. The publisher is
// created once and cached so that repeated toggles (e.g. blade on/off during a
// manual mowing session) reuse the warm connection.
func (p *RosProvider) PublishAction(action string) error {
	// getNode() locks p.mtx itself, so call it before taking the lock to avoid
	// a re-entrant (deadlocking) lock.
	rosNode, err := p.getNode()
	if err != nil {
		return err
	}

	p.mtx.Lock()
	pub := p.actionPublisher
	p.mtx.Unlock()

	if pub == nil {
		newPub, err := goroslib.NewPublisher(goroslib.PublisherConf{
			Node:  rosNode,
			Topic: "/xbot/action",
			Msg:   &std_msgs.String{},
		})
		if err != nil {
			return err
		}
		p.mtx.Lock()
		if p.actionPublisher == nil {
			p.actionPublisher = newPub
			pub = newPub
		} else {
			// Another goroutine won the race; reuse theirs.
			pub = p.actionPublisher
			newPub.Close()
			newPub = nil
		}
		p.mtx.Unlock()
		// Only sleep when we actually created the publisher: give it time to
		// establish its connection to the mower_logic subscriber before the
		// first write, otherwise the first action would be dropped.
		if newPub != nil {
			time.Sleep(700 * time.Millisecond)
		}
	}

	pub.Write(&std_msgs.String{Data: action})
	return nil
}

func (p *RosProvider) UnSubscribe(topic string, id string) {
	p.mtx.Lock()
	defer p.mtx.Unlock()
	_, hasSubscriber := p.subscribers[topic][id]
	if hasSubscriber {
		p.subscribers[topic][id].Close()
		delete(p.subscribers[topic], id)
	}
}

func (p *RosProvider) initSubscribers() error {
	node, err := p.getNode()
	if err != nil {
		return err
	}
	if p.subscribers == nil {
		p.subscribers = make(map[string]map[string]*RosSubscriber)
	}
	if p.lastMessage == nil {
		p.lastMessage = make(map[string][]byte)
	}
	if p.statusSubscriber == nil {
		p.statusSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:      node,
			Topic:     "/ll/mower_status",
			Callback:  cbHandler[*mower_msgs.Status](p, "/ll/mower_status"),
			QueueSize: 1,
		})
		logrus.Info("Subscribed to /ll/mower_status")
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
			Topic:     "/ll/position/gps",
			Callback:  cbHandler[*xbot_msgs.AbsolutePose](p, "/ll/position/gps"),
			QueueSize: 1,
		})
		logrus.Info("Subscribed to /ll/position/gps")
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
			Topic:     "/ll/imu/data_raw",
			Callback:  cbHandler[*sensor_msgs.Imu](p, "/ll/imu/data_raw"),
			QueueSize: 1,
		})
		logrus.Info("Subscribed to /ll/imu/data_raw")
	}
	if p.ticksSubscriber == nil {
		p.ticksSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:      node,
			Topic:     "/xbot_positioning/wheel_ticks_in",
			Callback:  cbHandler[*xbot_msgs.WheelTick](p, "/xbot_positioning/wheel_ticks_in"),
			QueueSize: 1,
		})
		logrus.Info("Subscribed to /xbot_positioning/wheel_ticks_in")
	}
	if p.mapSubscriber == nil {
		p.mapSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:      node,
			Topic:     "/mower_map_service/json_map",
			Callback:  p.jsonMapHandler,
			QueueSize: 1,
		})
		logrus.Info("Subscribed to /mower_map_service/json_map")
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
	if p.powerSubscriber == nil {
		p.powerSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:      node,
			Topic:     "/ll/power",
			Callback:  cbHandler[*mower_msgs.Power](p, "/ll/power"),
			QueueSize: 1,
		})
		logrus.Info("Subscribed to /ll/power")
	}
	if p.emergencySubscriber == nil {
		p.emergencySubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:      node,
			Topic:     "/ll/emergency",
			Callback:  cbHandler[*mower_msgs.Emergency](p, "/ll/emergency"),
			QueueSize: 1,
		})
		logrus.Info("Subscribed to /ll/emergency")
	}
	if p.dockingSensorSubscriber == nil {
		p.dockingSensorSubscriber, err = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:      node,
			Topic:     "/mower/docking_sensor",
			Callback:  cbHandler[*mower_msgs.DockingSensor](p, "/mower/docking_sensor"),
			QueueSize: 1,
		})
		logrus.Info("Subscribed to /mower/docking_sensor")
	}
	if p.lidarSubscriber == nil {
		p.lidarSubscriber, _ = goroslib.NewSubscriber(goroslib.SubscriberConf{
			Node:      node,
			Topic:     "/scan",
			Callback:  cbHandler[*sensor_msgs.LaserScan](p, "/scan"),
			QueueSize: 1,
		})
		if p.lidarSubscriber != nil {
			logrus.Info("Subscribed to /scan")
		}
	}
	return nil
}

func cbHandler[T any](p *RosProvider, topic string) func(msg T) {
	return func(msg T) {
		p.mtx.Lock()
		defer p.mtx.Unlock()
		msgJson, err := json.Marshal(msg)
		if err != nil {
			logrus.Error(xerrors.Errorf("failed to marshal message: %w", err))
			return
		}
		p.lastMessage[topic] = msgJson
		subscribers, hasSubscriber := p.subscribers[topic]
		if hasSubscriber {
			for _, cb := range subscribers {
				cb.Publish(msgJson)
			}
		}
	}
}

// jsonMapPoint represents a point in the JSON map format
type jsonMapPoint struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// jsonMapArea represents an area in the JSON map format
type jsonMapArea struct {
	ID         string                 `json:"id"`
	Properties map[string]interface{} `json:"properties"`
	Outline    []jsonMapPoint         `json:"outline"`
}

// jsonDockingStation represents a docking station in the JSON map format
type jsonDockingStation struct {
	ID         string            `json:"id"`
	Properties map[string]interface{} `json:"properties"`
	Position   jsonMapPoint      `json:"position"`
	Heading    float64           `json:"heading"`
}

// jsonMapData represents the full JSON map from mower_map_service
type jsonMapData struct {
	Areas           []jsonMapArea        `json:"areas"`
	DockingStations []jsonDockingStation `json:"docking_stations"`
}

func (p *RosProvider) jsonMapHandler(msg *std_msgs.String) {
	var mapData jsonMapData
	if err := json.Unmarshal([]byte(msg.Data), &mapData); err != nil {
		logrus.Error(xerrors.Errorf("failed to parse JSON map: %w", err))
		return
	}

	// Convert to xbot_msgs.Map format
	var result xbot_msgs.Map

	// Calculate map bounds
	minX, minY := math.MaxFloat64, math.MaxFloat64
	maxX, maxY := -math.MaxFloat64, -math.MaxFloat64

	// The JSON areas are flat: mow/nav/obstacle entries in order.
	// Obstacles follow their parent mowing area (implicit ordering from mower_map_service).
	// We need to reconstruct the nested structure the frontend expects.
	var lastMowIndex int = -1

	for _, area := range mapData.Areas {
		areaType, _ := area.Properties["type"].(string)

		outlineToPolygon := func(outline []jsonMapPoint) geometry_msgs.Polygon {
			var poly geometry_msgs.Polygon
			for _, pt := range outline {
				poly.Points = append(poly.Points, geometry_msgs.Point32{
					X: float32(pt.X), Y: float32(pt.Y), Z: 0,
				})
			}
			return poly
		}

		switch areaType {
		case "obstacle":
			// Attach to the last mowing area
			if lastMowIndex >= 0 && lastMowIndex < len(result.WorkingArea) {
				result.WorkingArea[lastMowIndex].Obstacles = append(
					result.WorkingArea[lastMowIndex].Obstacles,
					outlineToPolygon(area.Outline),
				)
			}
		case "nav":
			var mapArea xbot_msgs.MapArea
			if name, ok := area.Properties["name"].(string); ok {
				mapArea.Name = name
			}
			mapArea.Area = outlineToPolygon(area.Outline)
			result.NavigationAreas = append(result.NavigationAreas, mapArea)
		default: // "mow" or any other type treated as mowing area
			var mapArea xbot_msgs.MapArea
			if name, ok := area.Properties["name"].(string); ok {
				mapArea.Name = name
			}
			mapArea.Area = outlineToPolygon(area.Outline)
			result.WorkingArea = append(result.WorkingArea, mapArea)
			lastMowIndex = len(result.WorkingArea) - 1
		}

		// Update bounds from all area types
		for _, pt := range area.Outline {
			if pt.X < minX { minX = pt.X }
			if pt.X > maxX { maxX = pt.X }
			if pt.Y < minY { minY = pt.Y }
			if pt.Y > maxY { maxY = pt.Y }
		}
	}

	if minX != math.MaxFloat64 {
		result.MapWidth = maxX - minX
		result.MapHeight = maxY - minY
		result.MapCenterX = (minX + maxX) / 2
		result.MapCenterY = (minY + maxY) / 2
	}

	if len(mapData.DockingStations) > 0 {
		dock := mapData.DockingStations[0]
		result.DockX = dock.Position.X
		result.DockY = dock.Position.Y
		result.DockHeading = dock.Heading
	}

	// Publish as the topic the GUI expects
	const topic = "/xbot_monitoring/map"
	p.mtx.Lock()
	defer p.mtx.Unlock()
	msgJson, err := json.Marshal(result)
	if err != nil {
		logrus.Error(xerrors.Errorf("failed to marshal map: %w", err))
		return
	}
	p.lastMessage[topic] = msgJson
	subscribers, hasSubscriber := p.subscribers[topic]
	if hasSubscriber {
		for _, cb := range subscribers {
			cb.Publish(msgJson)
		}
	}
}
