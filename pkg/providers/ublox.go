package providers

import (
	"golang.org/x/sys/execabs"
	"golang.org/x/xerrors"
	"io"
)

type UbloxProvider struct {
}

func NewUbloxProvider() *UbloxProvider {
	u := &UbloxProvider{}
	return u
}

func (fp *UbloxProvider) FlashGPS(writer io.Writer) error {
	//Build firmware
	_, _ = writer.Write([]byte("------> Uploading GPS configuration...\n"))
	cmd := execabs.Command("/bin/bash", "-c", "ubxload --port /dev/gps --baudrate 115200 --timeout 0.05 --infile Robot.txt.get.ubx --verbosity 3")
	cmd.Dir = "/app/setup"
	cmd.Stdout = writer
	cmd.Stderr = writer
	err := cmd.Run()
	if err != nil {
		_, _ = writer.Write([]byte("------> Error while building and uploading firmware: " + err.Error() + "\n"))
		return xerrors.Errorf("error while flashing gps: %w", err)
	}
	_, _ = writer.Write([]byte("------> GPS flashed\n"))
	return nil
}
