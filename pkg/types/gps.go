package types

import "io"

type IGpsProvider interface {
	FlashGPS(writer io.Writer) error
}
