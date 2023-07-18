package types

import (
	"context"
	"github.com/bluenviron/goroslib/v2"
)

type IRosProvider interface {
	CallService(ctx context.Context, srvName string, srv any, req any, res any) error
	Subscribe(topic string, cb interface{}) (*goroslib.Subscriber, error)
}
