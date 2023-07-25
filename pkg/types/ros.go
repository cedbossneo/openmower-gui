package types

import (
	"context"
)

type IRosProvider interface {
	CallService(ctx context.Context, srvName string, srv any, req any, res any) error
	Subscribe(topic string, id string, cb func(msg any)) error
	UnSubscribe(topic string, id string)
}
