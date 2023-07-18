package providers

import (
	"context"
	"github.com/bluenviron/goroslib/v2"
	types2 "mowgli-gui/pkg/types"
	"os"
	"sync"
)

type RosProvider struct {
	node *goroslib.Node
	mtx  sync.Mutex
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
	return &RosProvider{}
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

func (p *RosProvider) Subscribe(topic string, cb interface{}) (*goroslib.Subscriber, error) {
	rosNode, err := p.getNode()
	if err != nil {
		return nil, err
	}
	return goroslib.NewSubscriber(goroslib.SubscriberConf{
		Node:     rosNode,
		Topic:    topic,
		Callback: cb,
	})
}
