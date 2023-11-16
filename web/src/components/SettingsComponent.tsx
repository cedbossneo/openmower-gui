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
import {FormButtonGroup, FormItem, FormLayout, Input, NumberPicker, Select, Switch} from "@formily/antd-v5";
import {useApi} from "../hooks/useApi.ts";
import {App, Card, Col, Row} from "antd";
import React, {CSSProperties, useEffect} from "react";
import {createForm, Form, onFieldValueChange} from "@formily/core";

import {SettingsConfig, SettingsDesc, SettingValueType, useSettings} from "../hooks/useSettings.ts";

const form = createForm<SettingsConfig>({
    effects() {
        onFieldValueChange('OM_MQTT_ENABLE', (field) => {
            form.setFieldState('*(OM_MQTT_HOSTNAME,OM_MQTT_PORT,OM_MQTT_USER,OM_MQTT_PASSWORD)', (state) => {
                //For the initial linkage, if the field cannot be found, setFieldState will push the update into the update queue until the field appears before performing the operation
                state.display = field.value ? "visible" : "hidden";
            })
        })
        onFieldValueChange('system.mqtt.enabled', (field) => {
            form.setFieldState('*(system.mqtt.host)', (state) => {
                //For the initial linkage, if the field cannot be found, setFieldState will push the update into the update queue until the field appears before performing the operation
                state.display = field.value ? "visible" : "hidden";
            })
        })
        onFieldValueChange('system.homekit.enabled', (field) => {
            form.setFieldState('*(system.homekit.pincode)', (state) => {
                //For the initial linkage, if the field cannot be found, setFieldState will push the update into the update queue until the field appears before performing the operation
                state.display = field.value ? "visible" : "hidden";
            })
        })
        onFieldValueChange('system.map.enabled', (field) => {
            form.setFieldState('*(system.map.tileServer,system.map.tileUri)', (state) => {
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
        Switch,
        NumberPicker,
    },
})
export const SettingsComponent: React.FC<{ actions?: (form: Form<SettingsConfig>, save: (values: SettingsConfig) => Promise<void>, restartOM: () => Promise<void>, restartGUI: () => Promise<void>) => React.ReactElement[], contentStyle?: CSSProperties }> = (props) => {
    const guiApi = useApi()
    const {notification} = App.useApp();
    const {settings, setSettings, loading} = useSettings()
    useEffect(() => {
        if (settings && Object.keys(settings).length > 0) {
            form.setInitialValues(settings)
        }
    }, [settings]);
    useEffect(() => {
        form.setLoading(loading)
    }, [loading]);

    const restartOpenMower = async () => {
        try {
            const resContainersList = await guiApi.containers.containersList()
            if (resContainersList.error) {
                throw new Error(resContainersList.error.error)
            }
            const openMowerContainer = resContainersList.data.containers?.find((container) => container.labels?.app == "openmower" || container.names?.includes("/openmower"))
            if (openMowerContainer?.id) {
                const res = await guiApi.containers.containersCreate(openMowerContainer.id, "restart")
                if (res.error) {
                    throw new Error(res.error.error)
                }
                notification.success({
                    message: "OpenMower restarted",
                })
            } else {
                throw new Error("OpenMower container not found")
            }
        } catch (e: any) {
            notification.error({
                message: "Failed to restart OpenMower",
                description: e.message,
            })
        }
    }

    const restartGui = async () => {
        try {
            const resContainersList = await guiApi.containers.containersList()
            if (resContainersList.error) {
                throw new Error(resContainersList.error.error)
            }
            const openMowerContainer = resContainersList.data.containers?.find((container) => container.labels?.app == "gui" || container.names?.includes("/openmower-gui"))
            if (openMowerContainer?.id) {
                const res = await guiApi.containers.containersCreate(openMowerContainer.id, "restart")
                if (res.error) {
                    throw new Error(res.error.error)
                }
                notification.success({
                    message: "OpenMower restarted",
                })
            } else {
                throw new Error("OpenMower container not found")
            }
        } catch (e: any) {
            notification.error({
                message: "Failed to restart OpenMower",
                description: e.message,
            })
        }
    }

    const sections = Object.keys(SettingsDesc).reduce((acc, key) => {
        const setting = SettingsDesc[key];
        if (!acc[setting.section]) {
            acc[setting.section] = []
        }
        acc[setting.section].push(key)
        return acc
    }, {} as Record<string, string[]>)

    return <Row>
        <FormProvider form={form}>
            <Col span={24} style={{height: '80vh', overflowY: 'auto', ...props.contentStyle}}>
                <FormLayout layout="vertical">
                    {
                        Object.keys(sections).map(section => {
                            return (
                                <Card key={section} title={section} style={{marginBottom: 16}}>
                                    {
                                        sections[section].map(settingKey => {
                                            const setting = SettingsDesc[settingKey];
                                            switch (setting.type) {
                                                case SettingValueType.Lat:
                                                    return (
                                                        <SchemaField key={settingKey}><SchemaField.Number
                                                            name={settingKey}
                                                            title={setting.description}
                                                            default={setting.defaultValue}
                                                            x-component-props={{step: 0.000000001}}
                                                            x-component="NumberPicker"
                                                            x-decorator-props={{tooltip: setting.help}}
                                                            x-decorator="FormItem"/></SchemaField>)
                                                case SettingValueType.Lon:
                                                    return (
                                                        <SchemaField key={settingKey}><SchemaField.Number
                                                            name={settingKey}
                                                            title={setting.description}
                                                            default={setting.defaultValue}
                                                            x-component-props={{step: 0.000000001}}
                                                            x-component="NumberPicker"
                                                            x-decorator-props={{tooltip: setting.help}}
                                                            x-decorator="FormItem"/></SchemaField>)
                                                case SettingValueType.Boolean:
                                                    return (
                                                        <SchemaField key={settingKey}><SchemaField.Boolean
                                                            name={settingKey} title={setting.description}
                                                            default={setting.defaultValue} x-component="Switch"
                                                            x-decorator-props={{tooltip: setting.help}}
                                                            x-decorator="FormItem"/></SchemaField>)
                                                case SettingValueType.Float:
                                                    return (
                                                        <SchemaField key={settingKey}><SchemaField.Number
                                                            name={settingKey} title={setting.description}
                                                            default={setting.defaultValue}
                                                            x-component-props={{step: 0.01}}
                                                            x-decorator-props={{tooltip: setting.help}}
                                                            x-component="NumberPicker"
                                                            x-decorator="FormItem"/></SchemaField>)
                                                case SettingValueType.Int:
                                                    return (
                                                        <SchemaField key={settingKey}><SchemaField.Number
                                                            name={settingKey} title={setting.description}
                                                            default={setting.defaultValue}
                                                            x-component-props={{step: 1}}
                                                            x-decorator-props={{tooltip: setting.help}}
                                                            x-component="NumberPicker"
                                                            x-decorator="FormItem"/></SchemaField>)
                                                case SettingValueType.Select:
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
                                                case SettingValueType.String:
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
                    {props.actions && props.actions(form, setSettings, restartOpenMower, restartGui)}
                </FormButtonGroup>
            </Col>
        </FormProvider>
    </Row>
}