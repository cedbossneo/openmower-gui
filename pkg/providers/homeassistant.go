package providers

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	pahomqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/joho/godotenv"
	"github.com/sirupsen/logrus"
)

const (
	haDiscoveryPrefix = "homeassistant"
)

type HomeAssistantProvider struct {
	dbProvider *DBProvider
	client     pahomqtt.Client
	omPrefix   string // OM MQTT topic prefix, e.g. "openmower"
	deviceID   string
	deviceName string
	datumLat   float64
	datumLon   float64
	hasDatum   bool
}

type haDevice struct {
	Identifiers  []string `json:"identifiers"`
	Name         string   `json:"name"`
	Manufacturer string   `json:"manufacturer"`
	Model        string   `json:"model"`
}

type haAvailability struct {
	Topic         string `json:"topic"`
	ValueTemplate string `json:"value_template,omitempty"`
}

func NewHomeAssistantProvider(dbProvider *DBProvider) *HomeAssistantProvider {
	ha := &HomeAssistantProvider{
		dbProvider: dbProvider,
	}
	ha.init()
	return ha
}

func (ha *HomeAssistantProvider) init() {
	ha.deviceName = ha.dbProvider.GetWithEnvFallback("system.ha.device.name", "HA_DEVICE_NAME", "Mowgli")
	ha.deviceID = strings.ReplaceAll(strings.ToLower(ha.deviceName), " ", "_")

	ha.loadMowerConfig()
	ha.connectMQTT()
}

func (ha *HomeAssistantProvider) loadMowerConfig() {
	configFile := ha.dbProvider.GetWithEnvFallback("system.mower.configFile", "MOWER_CONFIG_FILE", "/config/mower_config.sh")
	content, err := os.ReadFile(configFile)
	if err != nil {
		logrus.Warnf("HA: cannot read mower config: %v", err)
		return
	}
	parsed, err := godotenv.Parse(strings.NewReader(string(content)))
	if err != nil {
		logrus.Warnf("HA: cannot parse mower config: %v", err)
		return
	}

	// OM MQTT prefix (what xbot_monitoring uses)
	ha.omPrefix = parsed["OM_MQTT_TOPIC_PREFIX"]
	if ha.omPrefix == "" {
		ha.omPrefix = "openmower"
	}
	logrus.Infof("HA: using OM MQTT prefix: %s", ha.omPrefix)

	// Datum for GPS conversion
	latStr := parsed["OM_DATUM_LAT"]
	lonStr := parsed["OM_DATUM_LONG"]
	if latStr == "" || lonStr == "" {
		logrus.Info("HA: datum not configured, device_tracker disabled")
		return
	}
	_, err1 := fmt.Sscanf(latStr, "%f", &ha.datumLat)
	_, err2 := fmt.Sscanf(lonStr, "%f", &ha.datumLon)
	if err1 != nil || err2 != nil {
		logrus.Warnf("HA: cannot parse datum: lat=%s lon=%s", latStr, lonStr)
		return
	}
	ha.hasDatum = true
	logrus.Infof("HA: datum loaded lat=%.6f lon=%.6f", ha.datumLat, ha.datumLon)
}

func (ha *HomeAssistantProvider) connectMQTT() {
	hostname := ha.dbProvider.GetWithEnvFallback("system.ha.mqtt.hostname", "HA_MQTT_HOSTNAME", "")
	if hostname == "" {
		// Fall back to OM_MQTT_HOSTNAME from mower config
		hostname = ha.getFromMowerConfig("OM_MQTT_HOSTNAME")
	}
	if hostname == "" {
		logrus.Error("HA: MQTT hostname not configured")
		return
	}
	port := ha.dbProvider.GetWithEnvFallback("system.ha.mqtt.port", "HA_MQTT_PORT", "1883")
	user := ha.dbProvider.GetWithEnvFallback("system.ha.mqtt.user", "HA_MQTT_USER", "")
	password := ha.dbProvider.GetWithEnvFallback("system.ha.mqtt.password", "HA_MQTT_PASSWORD", "")

	broker := fmt.Sprintf("tcp://%s:%s", hostname, port)
	logrus.Infof("HA: connecting to MQTT broker %s", broker)

	opts := pahomqtt.NewClientOptions().
		AddBroker(broker).
		SetClientID(fmt.Sprintf("mowgli-ha-%d", time.Now().UnixNano()%10000)).
		SetAutoReconnect(true).
		SetConnectRetry(true).
		SetConnectRetryInterval(10 * time.Second).
		SetOnConnectHandler(func(c pahomqtt.Client) {
			logrus.Info("HA: connected to MQTT broker")
			ha.publishDiscoveryConfigs()
		}).
		SetConnectionLostHandler(func(c pahomqtt.Client, err error) {
			logrus.Warnf("HA: MQTT connection lost: %v", err)
		})

	if user != "" {
		opts.SetUsername(user)
	}
	if password != "" {
		opts.SetPassword(password)
	}

	ha.client = pahomqtt.NewClient(opts)
	token := ha.client.Connect()
	go func() {
		token.Wait()
		if token.Error() != nil {
			logrus.Errorf("HA: MQTT connect error: %v", token.Error())
		}
	}()
}

func (ha *HomeAssistantProvider) getFromMowerConfig(key string) string {
	configFile := ha.dbProvider.GetWithEnvFallback("system.mower.configFile", "MOWER_CONFIG_FILE", "/config/mower_config.sh")
	content, err := os.ReadFile(configFile)
	if err != nil {
		return ""
	}
	parsed, err := godotenv.Parse(strings.NewReader(string(content)))
	if err != nil {
		return ""
	}
	return parsed[key]
}

func (ha *HomeAssistantProvider) device() haDevice {
	return haDevice{
		Identifiers:  []string{ha.deviceID},
		Name:         ha.deviceName,
		Manufacturer: "OpenMower",
		Model:        "Mowgli",
	}
}

func (ha *HomeAssistantProvider) publish(topic string, payload interface{}, retained bool) {
	if ha.client == nil || !ha.client.IsConnected() {
		return
	}
	var data []byte
	switch v := payload.(type) {
	case string:
		data = []byte(v)
	case []byte:
		data = v
	default:
		var err error
		data, err = json.Marshal(payload)
		if err != nil {
			logrus.Errorf("HA: marshal error for %s: %v", topic, err)
			return
		}
	}
	token := ha.client.Publish(topic, 1, retained, data)
	go func() {
		token.Wait()
		if token.Error() != nil {
			logrus.Errorf("HA: publish error for %s: %v", topic, token.Error())
		}
	}()
}

func (ha *HomeAssistantProvider) publishDiscovery(component, objectID string, config map[string]interface{}) {
	topic := fmt.Sprintf("%s/%s/%s/%s/config", haDiscoveryPrefix, component, ha.deviceID, objectID)
	ha.publish(topic, config, true)
}

// publishDiscoveryConfigs publishes all HA MQTT Discovery configs.
// These point state_topic at the existing topics published by xbot_monitoring,
// using value_template to extract fields from the robot_state/json payload.
func (ha *HomeAssistantProvider) publishDiscoveryConfigs() {
	dev := ha.device()
	robotStateTopic := ha.omPrefix + "/robot_state/json"
	actionTopic := ha.omPrefix + "/action"

	// Lawn mower entity
	ha.publishDiscovery("lawn_mower", "mower", map[string]interface{}{
		"name":      nil,
		"unique_id": ha.deviceID + "_mower",
		"object_id": ha.deviceID,
		"activity_state_topic": robotStateTopic,
		"activity_value_template": `{% if value_json.emergency %}error{% elif value_json.current_state in ['MOWING','UNDOCKING'] %}mowing{% elif value_json.current_state == 'DOCKING' and value_json.is_charging %}docked{% elif value_json.current_state == 'DOCKING' %}mowing{% elif value_json.current_state == 'IDLE' and value_json.is_charging %}docked{% elif value_json.current_state == 'IDLE' %}paused{% else %}error{% endif %}`,
		"start_mowing_command_topic":    actionTopic,
		"start_mowing_command_template": "mower_logic:idle/start_mowing",
		"pause_command_topic":           actionTopic,
		"pause_command_template":        "mower_logic:mowing/abort_mowing",
		"dock_command_topic":            actionTopic,
		"dock_command_template":         "mower_logic:mowing/abort_mowing",
		"device":                        dev,
	})

	// Sensors from robot_state/json
	ha.publishJsonSensor("battery", "Battery", "%", "battery", "measurement",
		"{{ (value_json.battery_percentage * 100) | round(0) }}", dev)
	ha.publishJsonSensor("gps_quality", "GPS Quality", "%", "", "measurement",
		"{{ (value_json.gps_percentage * 100) | round(0) }}", dev)
	ha.publishJsonSensor("state", "State", "", "", "",
		"{{ value_json.current_state }}", dev)
	ha.publishJsonSensor("current_area", "Current Area", "", "", "",
		"{{ value_json.current_area }}", dev)

	// Sensors from individual sensor topics
	ha.publishSensorTopic("om_v_battery", "Battery Voltage", "V", "voltage", "measurement", dev)
	ha.publishSensorTopic("om_v_charge", "Charge Voltage", "V", "voltage", "measurement", dev)
	ha.publishSensorTopic("om_charge_current", "Charge Current", "A", "current", "measurement", dev)
	ha.publishSensorTopic("om_mow_esc_temp", "Mow ESC Temperature", "\u00b0C", "temperature", "measurement", dev)
	ha.publishSensorTopic("om_mow_motor_temp", "Mow Motor Temperature", "\u00b0C", "temperature", "measurement", dev)
	ha.publishSensorTopic("om_mow_motor_rpm", "Mow Motor RPM", "RPM", "", "measurement", dev)
	ha.publishSensorTopic("om_mow_motor_current", "Mow Motor Current", "A", "current", "measurement", dev)
	ha.publishSensorTopic("om_left_esc_temp", "Left ESC Temperature", "\u00b0C", "temperature", "measurement", dev)
	ha.publishSensorTopic("om_right_esc_temp", "Right ESC Temperature", "\u00b0C", "temperature", "measurement", dev)
	ha.publishSensorTopic("om_gps_accuracy", "GPS Accuracy", "m", "distance", "measurement", dev)

	// Binary sensors from robot_state/json
	ha.publishBinarySensor("emergency", "Emergency", "problem",
		"{{ 'ON' if value_json.emergency else 'OFF' }}", dev)
	ha.publishBinarySensor("is_charging", "Charging", "battery_charging",
		"{{ 'ON' if value_json.is_charging else 'OFF' }}", dev)
	ha.publishBinarySensor("rain", "Rain", "moisture",
		"{{ 'ON' if value_json.rain_detected else 'OFF' }}", dev)

	// Buttons -> publish to OM action topic
	ha.publishButton("start_mowing", "Start Mowing", "mdi:play", "mower_logic:idle/start_mowing", dev)
	ha.publishButton("pause", "Pause", "mdi:pause", "mower_logic:mowing/pause", dev)
	ha.publishButton("continue", "Continue", "mdi:play-pause", "mower_logic:mowing/continue", dev)
	ha.publishButton("dock", "Dock", "mdi:home", "mower_logic:mowing/abort_mowing", dev)
	ha.publishButton("skip_area", "Skip Area", "mdi:skip-next", "mower_logic:mowing/skip_area", dev)
	ha.publishButton("reset_emergency", "Reset Emergency", "mdi:alert-remove-outline", "mower_logic/reset_emergency", dev)

	// Device tracker (GPS position from robot_state/json pose)
	if ha.hasDatum {
		ha.publishDiscovery("device_tracker", "position", map[string]interface{}{
			"name":      "Position",
			"unique_id": ha.deviceID + "_position",
			"object_id": ha.deviceID + "_position",
			"json_attributes_topic": robotStateTopic,
			"json_attributes_template": fmt.Sprintf(
				`{"latitude": %.8f + (value_json.pose.y * 0.00000898), "longitude": %.8f + (value_json.pose.x * 0.00000898 / cos(%.8f * 3.14159265359 / 180.0)), "gps_accuracy": value_json.pose.accuracy | default(5), "source_type": "gps"}`,
				ha.datumLat, ha.datumLon, ha.datumLat,
			),
			"source_type": "gps",
			"device":      dev,
		})
	}

	logrus.Infof("HA: discovery configs published (%d entities)", 4+10+3+6+func() int {
		if ha.hasDatum {
			return 1
		}
		return 0
	}())
}

// publishJsonSensor creates a sensor discovery config that reads from robot_state/json.
func (ha *HomeAssistantProvider) publishJsonSensor(objectID, name, unit, deviceClass, stateClass, valueTemplate string, dev haDevice) {
	config := map[string]interface{}{
		"name":           name,
		"unique_id":      ha.deviceID + "_" + objectID,
		"object_id":      ha.deviceID + "_" + objectID,
		"state_topic":    ha.omPrefix + "/robot_state/json",
		"value_template": valueTemplate,
		"device":         dev,
	}
	if unit != "" {
		config["unit_of_measurement"] = unit
	}
	if deviceClass != "" {
		config["device_class"] = deviceClass
	}
	if stateClass != "" {
		config["state_class"] = stateClass
	}
	ha.publishDiscovery("sensor", objectID, config)
}

// publishSensorTopic creates a sensor discovery config for an individual OM sensor topic.
func (ha *HomeAssistantProvider) publishSensorTopic(sensorID, name, unit, deviceClass, stateClass string, dev haDevice) {
	config := map[string]interface{}{
		"name":           name,
		"unique_id":      ha.deviceID + "_" + sensorID,
		"object_id":      ha.deviceID + "_" + sensorID,
		"state_topic":    ha.omPrefix + "/sensors/" + sensorID + "/data",
		"value_template": "{{ value | round(2) }}",
		"device":         dev,
	}
	if unit != "" {
		config["unit_of_measurement"] = unit
	}
	if deviceClass != "" {
		config["device_class"] = deviceClass
	}
	if stateClass != "" {
		config["state_class"] = stateClass
	}
	ha.publishDiscovery("sensor", sensorID, config)
}

// publishBinarySensor creates a binary_sensor discovery config from robot_state/json.
func (ha *HomeAssistantProvider) publishBinarySensor(objectID, name, deviceClass, valueTemplate string, dev haDevice) {
	config := map[string]interface{}{
		"name":           name,
		"unique_id":      ha.deviceID + "_" + objectID,
		"object_id":      ha.deviceID + "_" + objectID,
		"state_topic":    ha.omPrefix + "/robot_state/json",
		"value_template": valueTemplate,
		"payload_on":     "ON",
		"payload_off":    "OFF",
		"device":         dev,
	}
	if deviceClass != "" {
		config["device_class"] = deviceClass
	}
	ha.publishDiscovery("binary_sensor", objectID, config)
}

// publishButton creates a button discovery config that publishes an action string to the OM action topic.
func (ha *HomeAssistantProvider) publishButton(objectID, name, icon, actionPayload string, dev haDevice) {
	config := map[string]interface{}{
		"name":             name,
		"unique_id":        ha.deviceID + "_btn_" + objectID,
		"object_id":        ha.deviceID + "_btn_" + objectID,
		"command_topic":    ha.omPrefix + "/action",
		"payload_press":    actionPayload,
		"device":           dev,
	}
	if icon != "" {
		config["icon"] = icon
	}
	ha.publishDiscovery("button", objectID, config)
}
