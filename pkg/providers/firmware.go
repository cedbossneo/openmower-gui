package providers

import (
	"bytes"
	"github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"golang.org/x/sys/execabs"
	"golang.org/x/xerrors"
	"io"
	"os"
	"text/template"
)

type FirmwareConfig struct {
	Repository                     string  `json:"repository"`
	Branch                         string  `json:"branch"`
	BoardType                      string  `json:"boardType"`
	PanelType                      string  `json:"panelType"`
	DebugType                      string  `json:"debugType"`
	DisableEmergency               bool    `json:"disableEmergency"`
	MaxMps                         float32 `json:"maxMps"`
	MaxChargeCurrent               float32 `json:"maxChargeCurrent"`
	LimitVoltage150MA              float32 `json:"limitVoltage150MA"`
	MaxChargeVoltage               float32 `json:"maxChargeVoltage"`
	BatChargeCutoffVoltage         float32 `json:"batChargeCutoffVoltage"`
	OneWheelLiftEmergencyMillis    int     `json:"oneWheelLiftEmergencyMillis"`
	BothWheelsLiftEmergencyMillis  int     `json:"bothWheelsLiftEmergencyMillis"`
	TiltEmergencyMillis            int     `json:"tiltEmergencyMillis"`
	StopButtonEmergencyMillis      int     `json:"stopButtonEmergencyMillis"`
	PlayButtonClearEmergencyMillis int     `json:"playButtonClearEmergencyMillis"`
	ExternalImuAcceleration        bool    `json:"externalImuAcceleration"`
	ExternalImuAngular             bool    `json:"externalImuAngular"`
	MasterJ18                      bool    `json:"masterJ18"`
}

type FirmwareProvider struct {
}

func NewFirmwareProvider() *FirmwareProvider {
	u := &FirmwareProvider{}
	return u
}

// BuildBoardHeader Open file ../../setup/board.h, apply go template to it with config and return the result
func (fp *FirmwareProvider) buildBoardHeader(templateFile string, config FirmwareConfig) ([]byte, error) {
	if config.BatChargeCutoffVoltage > 29 {
		config.BatChargeCutoffVoltage = 29
	}
	if config.MaxChargeVoltage > 29 {
		config.MaxChargeVoltage = 29
	}
	if config.LimitVoltage150MA > 29 {
		config.LimitVoltage150MA = 29
	}
	if config.MaxChargeCurrent > 1.5 {
		config.MaxChargeCurrent = 1.5
	}
	files, err := template.ParseFiles(templateFile)
	if err != nil {
		return nil, err
	}
	buffer := bytes.NewBuffer(nil)
	err = files.Execute(buffer, config)
	if err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

func (fp *FirmwareProvider) FlashFirmware(writer io.Writer, config FirmwareConfig) error {
	if config.Repository == "" {
		config.Repository = "https://github.com/cedbossneo/Mowgli"
	}
	if config.Branch == "" {
		config.Branch = "main"
	}
	_, _ = writer.Write([]byte("------> Cloning repository " + config.Repository + "@" + config.Branch + "...\n"))
	//Clone git repository, checkout branch, build board.h, build firmware with platformio, flash firmware with platformio
	referenceName := plumbing.ReferenceName("refs/heads/" + config.Branch)
	//Check if repository is already cloned
	_, err := os.Stat(os.TempDir() + "/mowgli")
	if err == nil {
		//Branch is not correct, delete repository
		err = os.RemoveAll(os.TempDir() + "/mowgli")
		if err != nil {
			_, _ = writer.Write([]byte("------> Error while removing repository: " + err.Error() + "\n"))
			return xerrors.Errorf("error while removing repository: %w", err)
		}
	}
	_, err = git.PlainClone(os.TempDir()+"/mowgli", false, &git.CloneOptions{
		URL:           config.Repository,
		SingleBranch:  true,
		ReferenceName: referenceName,
		Progress:      writer,
	})
	if err != nil {
		_, _ = writer.Write([]byte("------> Error while cloning repository: " + err.Error() + "\n"))
		return xerrors.Errorf("error while cloning repository: %w", err)
	}
	_, _ = writer.Write([]byte("------> Repository cloned\n"))
	//Build board.h
	_, _ = writer.Write([]byte("------> Building board.h...\n"))
	boardTemplated, err := fp.buildBoardHeader("/tmp/mowgli/stm32/ros_usbnode/include/board.h.template", config)
	if err != nil {
		_, _ = writer.Write([]byte("------> Error while building board.h: " + err.Error() + "\n"))
		return xerrors.Errorf("error while building board.h: %w", err)
	}
	err = os.WriteFile("/tmp/mowgli/stm32/ros_usbnode/include/board.h", boardTemplated, 0644)
	if err != nil {
		_, _ = writer.Write([]byte("------> Error while writing board.h: " + err.Error() + "\n"))
		return xerrors.Errorf("error while writing board.h: %w", err)
	}
	_, _ = writer.Write([]byte("------> board.h built\n"))
	//Build firmware
	_, _ = writer.Write([]byte("------> Building and uploading firmware...\n"))
	cmd := execabs.Command("/bin/bash", "-c", "platformio run -t upload")
	cmd.Dir = "/tmp/mowgli/stm32/ros_usbnode"
	cmd.Stdout = writer
	cmd.Stderr = writer
	err = cmd.Run()
	if err != nil {
		_, _ = writer.Write([]byte("------> Error while building and uploading firmware: " + err.Error() + "\n"))
		return xerrors.Errorf("error while flashing firmware: %w", err)
	}
	_, _ = writer.Write([]byte("------> Firmware flashed\n"))
	return nil
}
