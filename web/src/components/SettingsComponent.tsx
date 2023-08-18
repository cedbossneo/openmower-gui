/*
################################
## Hardware Specific Settings ##
################################

# The type of mower you're using, used to get some hardware parameters automatically
# Currently supported:
# YardForce500
# CUSTOM (put your configs in ~/mower_params/)
export OM_MOWER="CUSTOM"

# Your Hardware Version (more a firmware version, really). Check the OpenMower docs (https://www.openmower.de/docs) for the firmware versions.
# Supported values as of today:
# 0_10_X_WT901: Use this if you have an WT901 and have a 0.10.x mainboard.
# 0_10_X_MPU9250: Use this if you have an MPU9250 and have a 0.10.x mainboard (be aware that there are many fake chips on the market. So probably not your hardware version).
# 0_9_X_WT901_INSTEAD_OF_SOUND: Use this if you have soldered the WT901 in the sound module's slot and have a 0.9.x mainboard.
# 0_9_X_MPU9250: Use this if you have an MPU9250 and have a 0.9.x mainboard (be aware that there are many fake chips on the market. So probably not your hardware version).
export OM_HARDWARE_VERSION=""

# Select your ESC type
# Supported values as of today:
# xesc_mini: for the STM32 version (VESC)
# xesc_2040: for the RP2040 version (very experimental!)
export OM_MOWER_ESC_TYPE="xesc_mini"

# Select your gamepad
# Currently supported: ps3, xbox360
export OM_MOWER_GAMEPAD="xbox360"

# Set to true to record your session.
# Output will be stored in your $HOME
# export OM_ENABLE_RECORDING_ALL=False

################################
##        GPS Settings        ##
################################
# Relative Positioning vs LatLng coordinates
# If OM_USE_RELATIVE_POSITION=False, we're using an arbitrary point as map origin. This point is called the DATUM point and
# needs to be set using OM_DATUM_LAT and OM_DATUM_LONG below.
# If OM_USE_RELATIVE_POSITION=True, we're using the ublox NAVRELPOSNED messages as position.
# This makes your base station the map origin
# For it recommended to set OM_USE_RELATIVE_POSITION to False. This way you can move your base station without re-recording your maps and it's also more compatible overall.
export OM_USE_RELATIVE_POSITION=False

# If needed, uncomment and set to coordinates near you (these default coordinates are somewhere in Germany).
# This will be your map origin!
export OM_DATUM_LAT=48.8831951
export OM_DATUM_LONG=2.1661984
# export OM_DATUM_LAT=48.13724720055111
# export OM_DATUM_LONG=11.575605219552623

# GPS protocol. Use UBX for u-blox chipsets and NMEA for everything else
export OM_GPS_PROTOCOL=UBX

# NTRIP Settings
# Set to False if using external radio plugged into the Ardusimple board.
export OM_USE_NTRIP=True
export OM_NTRIP_HOSTNAME=caster.centipede.fr
export OM_NTRIP_PORT=2101
export OM_NTRIP_USER=centipede
export OM_NTRIP_PASSWORD=centipede
export OM_NTRIP_ENDPOINT=OUIL

# If you want to use F9R's sensor fusion, set this to true (you will also need to set DATUM_LAT and DATUM_LONG.
# Consider this option unstable, since I don't have the F9R anymore, so I'm not able to test this.
# IF YOU DONT KNOW WHAT THIS IS, SET IT TO FALSE
export OM_USE_F9R_SENSOR_FUSION=False


################################
##    Mower Logic Settings    ##
################################
# The distance to drive forward AFTER reaching the second docking point
export OM_DOCKING_DISTANCE=1.0

# The distance to drive for undocking. This needs to be large enough for the robot to have GPS reception
export OM_UNDOCK_DISTANCE=1.0

# How many outlines should the mover drive. It's not recommended to set this below 4.
export OM_OUTLINE_COUNT=4

# The width of mowing paths.
# Choose it smaller than your actual mowing tool in order to have some overlap.
# 0.13 works well for the Classic 500.
export OM_TOOL_WIDTH=0.13

# Voltages for battery to be considered full or empty
export OM_BATTERY_EMPTY_VOLTAGE=23.0
export OM_BATTERY_FULL_VOLTAGE=28.0

# Mower motor temperatures to stop and start mowing
export OM_MOWING_MOTOR_TEMP_HIGH=80.0
export OM_MOWING_MOTOR_TEMP_LOW=40.0

export OM_GPS_WAIT_TIME_SEC=10.0
export OM_GPS_TIMEOUT_SEC=5.0

# Mowing Behavior Settings
# True to enable mowing motor
export OM_ENABLE_MOWER=true

# True to start mowing automatically. If this is false, you need to start manually by pressing the start button
export OM_AUTOMATIC_MODE=0

export OM_OUTLINE_OFFSET=0.05

export OM_NO_COMMS=true

# Set default GPS antenna offset
export OM_ANTENNA_OFFSET_X=0.3
export OM_ANTENNA_OFFSET_Y=0.0

# Set distance between wheels in m
export OM_WHEEL_DISTANCE_M=0.325

# Set default ticks/m
export OM_WHEEL_TICKS_PER_M=300.0

# Heatmap UNSET or om_gps_accuracy
export OM_HEATMAP_SENSOR_IDS=om_gps_accuracy
 */
import {createSchemaField, FormProvider} from "@formily/react";
import {Checkbox, FormButtonGroup, FormItem, FormLayout, Input, NumberPicker, Select} from "@formily/antd-v5";
import {useApi} from "../hooks/useApi.ts";
import {Card, Col, notification, Row} from "antd";
import React, {CSSProperties, useEffect} from "react";
import {createForm, Form, onFieldValueChange} from "@formily/core";

enum SettingType {
    String = "string",
    Int = "int",
    Float = "float",
    Boolean = "boolean",
    Lat = "lat",
    Lon = "lon",
    Select = "select",
}

type Setting = { description: string, help?: string, section: string } & ({
    type: SettingType.String,
    defaultValue: string,
} | {
    type: SettingType.Boolean,
    defaultValue: boolean,
} | {
    type: SettingType.Int,
    defaultValue: number,
} | {
    type: SettingType.Float,
    defaultValue: number,
} | {
    type: SettingType.Lat,
    defaultValue: number,
} | {
    type: SettingType.Lon,
    defaultValue: number,
} | {
    type: SettingType.Select,
    defaultValue: string,
    options: { id: string, label: string }[],
})
const settings: Record<string, Setting> = {
    "OM_DATUM_LAT": {
        section: "Datum",
        type: SettingType.Lat,
        defaultValue: 43.0,
        description: "Latitude of the datum point",
        help: "This will be your map origin!"
    },
    "OM_DATUM_LONG": {
        section: "Datum",
        type: SettingType.Lon,
        defaultValue: 2.0,
        description: "Longitude of the datum point",
        help: "This will be your map origin!"
    },
    "OM_USE_NTRIP": {
        section: "NTRIP",
        type: SettingType.Boolean,
        defaultValue: true,
        description: "Use NTRIP to get RTK corrections",
        help: "Set to False if using external radio plugged into the Ardusimple board."
    },
    "OM_NTRIP_HOSTNAME": {
        section: "NTRIP",
        type: SettingType.String,
        defaultValue: "192.168.178.55",
        description: "NTRIP server hostname",
    },
    "OM_NTRIP_PORT": {section: "NTRIP", type: SettingType.Int, defaultValue: 2101, description: "NTRIP server port"},
    "OM_NTRIP_USER": {
        section: "NTRIP",
        type: SettingType.String,
        defaultValue: "gps",
        description: "NTRIP server username"
    },
    "OM_NTRIP_PASSWORD": {
        section: "NTRIP",
        type: SettingType.String,
        defaultValue: "gps",
        description: "NTRIP server password"
    },
    "OM_NTRIP_ENDPOINT": {
        section: "NTRIP",
        type: SettingType.String,
        defaultValue: "BASE1",
        description: "NTRIP server endpoint"
    },
    "OM_MOWER_GAMEPAD": {
        section: "Mower",
        type: SettingType.Select, defaultValue: "xbox360", description: "Gamepad type", options: [
            {
                id: "xbox360",
                label: "Xbox 360"
            },
            {
                id: "ps3",
                label: "PS3"
            },
            {
                id: "steam_stick",
                label: "Steam Stick"
            },
            {
                id: "steam_touch",
                label: "Steam Touch"
            }
        ]
    },
    "OM_ENABLE_RECORDING_ALL": {
        section: "Recording",
        type: SettingType.Boolean,
        defaultValue: false,
        description: "Enable recording of all topics"
    },
    "OM_USE_RELATIVE_POSITION": {
        section: "Positioning",
        type: SettingType.Boolean,
        defaultValue: false,
        description: "Use relative position to datum point",
        help: "If set to true, the mower will use the position relative to the datum point. If set to false, the mower will use the absolute position."
    },
    "OM_GPS_PROTOCOL": {
        section: "Positioning",
        type: SettingType.Select, defaultValue: "UBX", description: "GPS protocol", options: [
            {
                id: "UBX",
                label: "UBX"
            },
            {
                id: "NMEA",
                label: "NMEA"
            },
        ]
    },
    "OM_USE_F9R_SENSOR_FUSION": {
        section: "Positioning",
        help: "If you want to use F9R's sensor fusion, set this to true (you will also need to set DATUM_LAT and DATUM_LONG). If you want to use the GPS position, set this to false.",
        type: SettingType.Boolean, defaultValue: false, description: "Use F9R sensor fusion"
    },
    "OM_DOCKING_DISTANCE": {
        section: "Docking",
        type: SettingType.Float, defaultValue: 1.0, description: "Distance to dock"
    },
    "OM_UNDOCK_DISTANCE": {
        section: "Docking",
        type: SettingType.Float, defaultValue: 2.0, description: "Distance to undock"
    },
    "OM_OUTLINE_COUNT": {
        section: "Navigation",
        type: SettingType.Int, defaultValue: 4, description: "Number of points in the outline"
    },
    "OM_MOWING_ANGLE_OFFSET": {
        section: "Mower",
        type: SettingType.Float, defaultValue: 0, description: "Mowing angle offset"
    },
    "OM_MOWING_ANGLE_INCREMENT": {
        section: "Mower",
        type: SettingType.Float, defaultValue: 0.1, description: "Mowing angle increment"
    },
    "OM_MOWING_ANGLE_OFFSET_IS_ABSOLUTE": {
        section: "Mower",
        type: SettingType.Boolean,
        defaultValue: false,
        description: "Mowing angle offset is absolute"
    },
    "OM_TOOL_WIDTH": {
        section: "Mower",
        help: "Choose it smaller than your actual mowing tool in order to have some overlap.",
        type: SettingType.Float, defaultValue: 0.13, description: "Tool width"
    },
    "OM_BATTERY_EMPTY_VOLTAGE": {
        help: "Voltage for battery to be considered empty",
        section: "Mower",
        type: SettingType.Float, defaultValue: 25.0, description: "Battery empty voltage"
    },
    "OM_BATTERY_FULL_VOLTAGE": {
        help: "Voltage for battery to be considered full",
        section: "Mower",
        type: SettingType.Float, defaultValue: 28.5, description: "Battery full voltage"
    },
    "OM_MOWING_MOTOR_TEMP_HIGH": {
        help: "If the temperature of the mowing motor is higher than this value, the mower will stop.",
        section: "Mower",
        type: SettingType.Float,
        defaultValue: 80.0,
        description: "Mowing motor temperature high"
    },
    "OM_MOWING_MOTOR_TEMP_LOW": {
        section: "Mower",
        help: "If the temperature of the mowing motor is lower than this value, the mower will start again.",
        type: SettingType.Float,
        defaultValue: 40.0,
        description: "Mowing motor temperature low"
    },
    "OM_GPS_WAIT_TIME_SEC": {
        section: "Positioning",
        type: SettingType.Float, defaultValue: 10.0, description: "GPS wait time"
    },
    "OM_GPS_TIMEOUT_SEC": {
        section: "Positioning",
        type: SettingType.Float, defaultValue: 5.0, description: "GPS timeout"
    },
    "OM_ENABLE_MOWER": {
        section: "Mower",
        type: SettingType.Boolean, defaultValue: true, description: "Enable mower"
    },
    "OM_AUTOMATIC_MODE": {
        section: "Mower",
        type: SettingType.Select, defaultValue: "0", description: "Automatic mode", options: [
            {
                id: "0",
                label: "MANUAL - mowing requires manual start"
            },
            {
                id: "1",
                label: "SEMIAUTO - mow the entire map once then wait for manual start atgain"
            },
            {
                id: "2",
                label: "AUTO - mow whenever possible"
            }
        ]
    },
    "OM_OUTLINE_OFFSET": {
        section: "Navigation",
        help: "Offset of the outline from the boundary in meters.",
        type: SettingType.Float, defaultValue: 0.05, description: "Outline offset"
    },
    "OM_MQTT_ENABLE": {
        section: "MQTT",
        type: SettingType.Boolean, defaultValue: false, description: "Enable MQTT"
    },
    "OM_MQTT_HOSTNAME": {
        section: "MQTT",
        type: SettingType.String,
        defaultValue: "your_mqtt_broker",
        description: "MQTT broker hostname"
    },
    "OM_MQTT_PORT": {
        section: "MQTT",
        type: SettingType.Int, defaultValue: 1883, description: "MQTT broker port"
    },
    "OM_MQTT_USER": {
        section: "MQTT",
        type: SettingType.String, defaultValue: "", description: "MQTT broker username"
    },
    "OM_MQTT_PASSWORD": {
        section: "MQTT",
        type: SettingType.String, defaultValue: "", description: "MQTT broker password"
    },
}
export type SettingsConfig = {
    [P in keyof typeof settings]: Record<keyof typeof settings[P], typeof settings[P]['defaultValue']>;
}
const form = createForm<SettingsConfig>({
    effects() {
        onFieldValueChange('OM_MQTT_ENABLE', (field) => {
            form.setFieldState('*(OM_MQTT_HOSTNAME,OM_MQTT_PORT,OM_MQTT_USER,OM_MQTT_PASSWORD)', (state) => {
                //For the initial linkage, if the field cannot be found, setFieldState will push the update into the update queue until the field appears before performing the operation
                state.display = field.value ? "visible" : "hidden";
            })
        })
        onFieldValueChange('OM_USE_NTRIP', (field) => {
            form.setFieldState('*(OM_NTRIP_PORT,OM_NTRIP_USER,OM_NTRIP_PASSWORD,OM_NTRIP_ENDPOINT)', (state) => {
                //For the initial linkage, if the field cannot be found, setFieldState will push the update into the update queue until the field appears before performing the operation
                state.display = field.value ? "visible" : "hidden";
            })
        })
    },
})
const SchemaField = createSchemaField({
    components: {
        Input,
        FormItem,
        Select,
        Checkbox,
        NumberPicker,
    },
})
export const SettingsComponent: React.FC<{ actions?: (form: Form<SettingsConfig>, save: (values: SettingsConfig) => Promise<void>, restart: () => Promise<void>) => React.ReactElement[], contentStyle?: CSSProperties }> = (props) => {
    const guiApi = useApi()
    const [notificationInstance, notificationContextHolder] = notification.useNotification();
    useEffect(() => {
        (async () => {
            try {
                form.setLoading(true)
                const settingsList = await guiApi.settings.settingsList()
                if (settingsList.error) {
                    throw new Error(settingsList.error.error)
                }
                form.setLoading(false)
                const fetchedSettings = settingsList.data.settings ?? {};
                const newSettings: Record<string, any> = {}
                Object.keys(fetchedSettings).forEach((key) => {
                    if (settings[key]?.type === SettingType.Boolean) {
                        if (fetchedSettings[key] === "True" || fetchedSettings[key] == "1") {
                            newSettings[key] = true
                        } else if (fetchedSettings[key] === "False" || fetchedSettings[key] == "0") {
                            newSettings[key] = false
                        }
                    } else {
                        newSettings[key] = fetchedSettings[key]
                    }
                })
                form.setValues(newSettings)
            } catch (e: any) {
                notificationInstance.error({
                    message: "Failed to load settings",
                    description: e.message,
                })
                form.setLoading(false)
            }
        })()
    })

    const saveSettings = async (values: SettingsConfig) => {
        form.setLoading(true)
        try {
            const res = await guiApi.settings.settingsCreate(values)
            if (res.error) {
                throw new Error(res.error.error)
            }
            notificationInstance.success({
                message: "Settings saved",
            })
        } catch (e: any) {
            notificationInstance.error({
                message: "Failed to save settings",
                description: e.message,
            })
        }
        form.setLoading(false)
    };

    const restartOpenMower = async () => {
        try {
            const resContainersList = await guiApi.containers.containersList()
            if (resContainersList.error) {
                throw new Error(resContainersList.error.error)
            }
            const openMowerContainer = resContainersList.data.containers?.find((container) => container.labels?.app == "openmower")
            if (openMowerContainer?.id) {
                const res = await guiApi.containers.containersCreate(openMowerContainer.id, "restart")
                if (res.error) {
                    throw new Error(res.error.error)
                }
                notificationInstance.success({
                    message: "OpenMower restarted",
                })
            } else {
                throw new Error("OpenMower container not found")
            }
        } catch (e: any) {
            notificationInstance.error({
                message: "Failed to restart OpenMower",
                description: e.message,
            })
        }
    }

    const sections = Object.keys(settings).reduce((acc, key) => {
        const setting = settings[key];
        if (!acc[setting.section]) {
            acc[setting.section] = []
        }
        acc[setting.section].push(key)
        return acc
    }, {} as Record<string, string[]>)

    return <Row>
        {notificationContextHolder}
        <FormProvider form={form}>
            <Col span={24} style={{height: '80vh', overflowY: 'auto', ...props.contentStyle}}>
                <FormLayout layout="vertical">
                    {
                        Object.keys(sections).map(section => {
                            return (
                                <Card key={section} title={section} style={{marginBottom: 16}}>
                                    {
                                        sections[section].map(settingKey => {
                                            const setting = settings[settingKey];
                                            switch (setting.type) {
                                                case SettingType.Lat:
                                                    return (
                                                        <SchemaField key={settingKey}><SchemaField.Number
                                                            name={settingKey}
                                                            title={setting.description}
                                                            default={setting.defaultValue}
                                                            x-component-props={{step: 0.000000001}}
                                                            x-component="NumberPicker"
                                                            x-decorator-props={{tooltip: setting.help}}
                                                            x-decorator="FormItem"/></SchemaField>)
                                                case SettingType.Lon:
                                                    return (
                                                        <SchemaField key={settingKey}><SchemaField.Number
                                                            name={settingKey}
                                                            title={setting.description}
                                                            default={setting.defaultValue}
                                                            x-component-props={{step: 0.000000001}}
                                                            x-component="NumberPicker"
                                                            x-decorator-props={{tooltip: setting.help}}
                                                            x-decorator="FormItem"/></SchemaField>)
                                                case SettingType.Boolean:
                                                    return (
                                                        <SchemaField key={settingKey}><SchemaField.Boolean
                                                            name={settingKey} title={setting.description}
                                                            default={setting.defaultValue} x-component="Checkbox"
                                                            x-decorator-props={{tooltip: setting.help}}
                                                            x-decorator="FormItem"/></SchemaField>)
                                                case SettingType.Float:
                                                    return (
                                                        <SchemaField key={settingKey}><SchemaField.Number
                                                            name={settingKey} title={setting.description}
                                                            default={setting.defaultValue}
                                                            x-component-props={{step: 0.01}}
                                                            x-decorator-props={{tooltip: setting.help}}
                                                            x-component="NumberPicker"
                                                            x-decorator="FormItem"/></SchemaField>)
                                                case SettingType.Int:
                                                    return (
                                                        <SchemaField key={settingKey}><SchemaField.Number
                                                            name={settingKey} title={setting.description}
                                                            default={setting.defaultValue}
                                                            x-component-props={{step: 1}}
                                                            x-decorator-props={{tooltip: setting.help}}
                                                            x-component="NumberPicker"
                                                            x-decorator="FormItem"/></SchemaField>)
                                                case SettingType.Select:
                                                    return (
                                                        <SchemaField key={settingKey}><SchemaField.String
                                                            name={settingKey}
                                                            title={setting.description}
                                                            default={setting.defaultValue}
                                                            enum={setting.options.map(opt => ({
                                                                label: opt.label,
                                                                value: opt.id
                                                            }))} x-component="Select"
                                                            x-decorator-props={{tooltip: setting.help}}
                                                            x-decorator="FormItem"/></SchemaField>)
                                                case SettingType.String:
                                                    return (
                                                        <SchemaField key={settingKey}><SchemaField.String
                                                            name={settingKey}
                                                            title={setting.description}
                                                            default={setting.defaultValue}
                                                            x-component="Input"
                                                            x-decorator-props={{tooltip: setting.help}}
                                                            x-decorator="FormItem"/></SchemaField>)

                                            }
                                        })
                                    }
                                </Card>)
                        })
                    }
                </FormLayout>
            </Col>
            <Col span={24} style={{position: "fixed", bottom: 20}}>
                <FormButtonGroup>
                    {props.actions && props.actions(form, saveSettings, restartOpenMower)}
                </FormButtonGroup>
            </Col>
        </FormProvider>
    </Row>
}