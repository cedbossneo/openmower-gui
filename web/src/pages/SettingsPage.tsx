import {createForm, onFieldValueChange} from '@formily/core'
import {createSchemaField, FormProvider} from '@formily/react'
import {Checkbox, FormButtonGroup, FormItem, FormLayout, Input, NumberPicker, Select, Submit} from '@formily/antd-v5'
import {Button, Col, notification, Row, Typography} from "antd";
import {useEffect} from "react";

enum SettingType {
    String = "string",
    Int = "int",
    Float = "float",
    Boolean = "boolean",
    Lat = "lat",
    Lon = "lon",
    Select = "select",
}

type Setting = {description: string} & ({
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
}| {
    type: SettingType.Lon,
    defaultValue: number,
} | {
    type: SettingType.Select,
    defaultValue: string,
    options: { id: string, label: string }[],
})

const settings: Record<string, Setting> = {
    "OM_DATUM_LAT": {type: SettingType.Lat, defaultValue: 43.0, description: "Latitude of the datum point"},
    "OM_DATUM_LONG": {type: SettingType.Lon, defaultValue: 2.0, description: "Longitude of the datum point"},
    "OM_USE_NTRIP": {type: SettingType.Boolean, defaultValue: true, description: "Use NTRIP to get RTK corrections"},
    "OM_NTRIP_HOSTNAME": {
        type: SettingType.String,
        defaultValue: "192.168.178.55",
        description: "NTRIP server hostname"
    },
    "OM_NTRIP_PORT": {type: SettingType.Int, defaultValue: 2101, description: "NTRIP server port"},
    "OM_NTRIP_USER": {type: SettingType.String, defaultValue: "gps", description: "NTRIP server username"},
    "OM_NTRIP_PASSWORD": {type: SettingType.String, defaultValue: "gps", description: "NTRIP server password"},
    "OM_NTRIP_ENDPOINT": {type: SettingType.String, defaultValue: "BASE1", description: "NTRIP server endpoint"},
    "OM_MOWER_GAMEPAD": {
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
        type: SettingType.Boolean,
        defaultValue: false,
        description: "Enable recording of all topics"
    },
    "OM_USE_RELATIVE_POSITION": {
        type: SettingType.Boolean,
        defaultValue: false,
        description: "Use relative position to datum point"
    },
    "OM_GPS_PROTOCOL": {
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
    "OM_USE_F9R_SENSOR_FUSION": {type: SettingType.Boolean, defaultValue: false, description: "Use F9R sensor fusion"},
    "OM_DOCKING_DISTANCE": {type: SettingType.Float, defaultValue: 1.0, description: "Distance to dock"},
    "OM_UNDOCK_DISTANCE": {type: SettingType.Float, defaultValue: 2.0, description: "Distance to undock"},
    "OM_OUTLINE_COUNT": {type: SettingType.Int, defaultValue: 4, description: "Number of points in the outline"},
    "OM_MOWING_ANGLE_OFFSET": {type: SettingType.Float, defaultValue: 0, description: "Mowing angle offset"},
    "OM_MOWING_ANGLE_OFFSET_IS_ABSOLUTE": {
        type: SettingType.Boolean,
        defaultValue: false,
        description: "Mowing angle offset is absolute"
    },
    "OM_TOOL_WIDTH": {type: SettingType.Float, defaultValue: 0.13, description: "Tool width"},
    "OM_BATTERY_EMPTY_VOLTAGE": {type: SettingType.Float, defaultValue: 25.0, description: "Battery empty voltage"},
    "OM_BATTERY_FULL_VOLTAGE": {type: SettingType.Float, defaultValue: 28.5, description: "Battery full voltage"},
    "OM_MOWING_MOTOR_TEMP_HIGH": {
        type: SettingType.Float,
        defaultValue: 80.0,
        description: "Mowing motor temperature high"
    },
    "OM_MOWING_MOTOR_TEMP_LOW": {
        type: SettingType.Float,
        defaultValue: 40.0,
        description: "Mowing motor temperature low"
    },
    "OM_GPS_WAIT_TIME_SEC": {type: SettingType.Float, defaultValue: 10.0, description: "GPS wait time"},
    "OM_GPS_TIMEOUT_SEC": {type: SettingType.Float, defaultValue: 5.0, description: "GPS timeout"},
    "OM_ENABLE_MOWER": {type: SettingType.Boolean, defaultValue: true, description: "Enable mower"},
    "OM_AUTOMATIC_MODE": {
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
    "OM_OUTLINE_OFFSET": {type: SettingType.Float, defaultValue: 0.05, description: "Outline offset"},
    "OM_MQTT_ENABLE": {type: SettingType.Boolean, defaultValue: false, description: "Enable MQTT"},
    "OM_MQTT_HOSTNAME": {
        type: SettingType.String,
        defaultValue: "your_mqtt_broker",
        description: "MQTT broker hostname"
    },
    "OM_MQTT_PORT": {type: SettingType.Int, defaultValue: 1883, description: "MQTT broker port"},
    "OM_MQTT_USER": {type: SettingType.String, defaultValue: "", description: "MQTT broker username"},
    "OM_MQTT_PASSWORD": {type: SettingType.String, defaultValue: "", description: "MQTT broker password"},
}

type Config = {
    [P in keyof typeof settings]: Record<keyof typeof settings[P], typeof settings[P]['defaultValue']>;
}

const form = createForm<Config>({
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


export const SettingsPage = () => {
    const [api, contextHolder] = notification.useNotification();
    useEffect(() => {
        (async () => {
            try {
                form.setLoading(true)
                const settings = await fetch("/api/settings").then(res => res.json()) as {
                    settings: Config,
                    error?: string
                };
                if (settings.error) {
                    throw new Error(settings.error)
                }
                form.setLoading(false)
                form.setValues(settings.settings)
            } catch (e: any) {
                api.error({
                    message: "Failed to load settings",
                    description: e.message,
                })
                form.setLoading(false)
            }
        })()
    })

    const saveSettings = async (values: Config) => {
        form.setLoading(true)
        try {
            await fetch("/api/settings", {
                method: "POST",
                body: JSON.stringify({settings: values}),
            }).then(res => res.json()).then((res) => {
                if (res.error) {
                    throw new Error(res.error)
                }
            });
            api.success({
                message: "Settings saved",
            })
        } catch (e: any) {
            api.error({
                message: "Failed to save settings",
                description: e.message,
            })
        }
        form.setLoading(false)
    };

    const restartOpenMower = async () => {
        try {
            const containers = await fetch("/api/containers").then((res) => res.json()).then((containers) => {
                if (containers.error) {
                    throw new Error(containers.error)
                }
                return containers.containers as { Id: string, Labels: Record<string, string> }[]
            });
            const openMowerContainer = containers.find((container) => container.Labels["app"] == "openmower")
            if (openMowerContainer) {
                await fetch(`/api/containers/${openMowerContainer.Id}/restart`, {
                    method: "POST",
                }).then(res => res.json()).then((res) => {
                    if (res.error) {
                        throw new Error(res.error)
                    }
                })
                api.success({
                    message: "OpenMower restarted",
                })
            } else {
                throw new Error("OpenMower container not found")
            }
        } catch (e: any) {
            api.error({
                message: "Failed to restart OpenMower",
                description: e.message,
            })
        }
    }

    return (
        <FormProvider form={form}>
            <Row>
                <Col span={24}>
                    <Typography.Title level={2}>Settings</Typography.Title>
                </Col>
                <Col span={24} style={{height: '80vh', overflowY: 'auto'}}>
                    {contextHolder}
                    <FormLayout layout="vertical">
                        {
                            Object.keys(settings).map(settingKey => {
                                const setting = settings[settingKey];
                                switch (setting.type) {
                                    case SettingType.Lat:
                                        return (
                                            <SchemaField key={settingKey}><SchemaField.Number name={settingKey}
                                                                                              title={setting.description}
                                                                                              default={setting.defaultValue}
                                                                                              x-component-props={{step: 0.000000001}}
                                                                                              x-component="NumberPicker"
                                                                                              x-decorator="FormItem"/></SchemaField>)
                                    case SettingType.Lon:
                                        return (
                                            <SchemaField key={settingKey}><SchemaField.Number name={settingKey}
                                                                                              title={setting.description}
                                                                                              default={setting.defaultValue}
                                                                                              x-component-props={{step: 0.000000001}}
                                                                                              x-component="NumberPicker"
                                                                                              x-decorator="FormItem"/></SchemaField>)
                                    case SettingType.Boolean:
                                        return (
                                            <SchemaField key={settingKey}><SchemaField.Boolean name={settingKey} title={setting.description} default={setting.defaultValue} x-component="Checkbox" x-decorator="FormItem"/></SchemaField>)
                                    case SettingType.Float:
                                        return (
                                            <SchemaField key={settingKey}><SchemaField.Number name={settingKey} title={setting.description} default={setting.defaultValue} x-component-props={{step: 0.01}} x-component="NumberPicker" x-decorator="FormItem"/></SchemaField>)
                                    case SettingType.Int:
                                        return (
                                            <SchemaField key={settingKey}><SchemaField.Number name={settingKey} title={setting.description} default={setting.defaultValue} x-component-props={{step: 1}} x-component="NumberPicker" x-decorator="FormItem"/></SchemaField>)
                                    case SettingType.Select:
                                        return (
                                            <SchemaField key={settingKey}><SchemaField.String name={settingKey}
                                                                                              title={setting.description}
                                                                                              default={setting.defaultValue}
                                                                                              enum={setting.options.map(opt => ({
                                                                                                  label: opt.label,
                                                                                                  value: opt.id
                                                                                              }))} x-component="Select"
                                                                                              x-decorator="FormItem"/></SchemaField>)
                                    case SettingType.String:
                                        return (
                                            <SchemaField key={settingKey}><SchemaField.String name={settingKey}
                                                                                              title={setting.description}
                                                                                              default={setting.defaultValue}
                                                                                              x-component="Input"
                                                                                              x-decorator="FormItem"/></SchemaField>)

                                }
                            })
                        }
                    </FormLayout>
                </Col>
                <Col span={24} style={{position: "fixed", bottom: 20}}>
                    <FormButtonGroup>
                        <Submit onSubmit={saveSettings}>Save settings</Submit>
                        <Button onClick={restartOpenMower}>Restart OpenMower Container</Button>
                    </FormButtonGroup>
                </Col>
            </Row>
        </FormProvider>
)
}

export default SettingsPage;