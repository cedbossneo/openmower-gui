import {useApi} from "./useApi.ts";
import {App} from "antd";
import {useEffect, useState} from "react";

export enum SettingType {
    String = "string",
    Int = "int",
    Float = "float",
    Boolean = "boolean",
    Lat = "lat",
    Lon = "lon",
    Select = "select",
}

export type Setting = { description: string, help?: string, section: string } & ({
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
export const SettingsDesc: Record<string, Setting> = {
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
    "OM_BATTERY_CAPACITY_MAH": {
        help: "Battery capacity in mAh",
        section: "Mower",
        type: SettingType.Float, defaultValue: 3000.0, description: "Battery capacity"
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
    [P in keyof typeof SettingsDesc]: Record<keyof typeof SettingsDesc[P], typeof SettingsDesc[P]['defaultValue']>;
}
export const useSettings = () => {
    const guiApi = useApi()
    const {notification} = App.useApp();
    const [loading, setLoading] = useState<boolean>(false)
    const [settings, setSettings] = useState<Record<keyof typeof SettingsDesc, any>>({})
    useEffect(() => {
        (async () => {
            try {
                setLoading(true)
                const settingsList = await guiApi.settings.settingsList()
                if (settingsList.error) {
                    throw new Error(settingsList.error.error)
                }
                setLoading(false)
                const fetchedSettings = settingsList.data.settings ?? {};
                const newSettings: Record<string, any> = {}
                Object.keys(fetchedSettings).forEach((key) => {
                    if (SettingsDesc[key]?.type === SettingType.Boolean) {
                        if (fetchedSettings[key] === "True" || fetchedSettings[key] == "1") {
                            newSettings[key] = true
                        } else if (fetchedSettings[key] === "False" || fetchedSettings[key] == "0") {
                            newSettings[key] = false
                        }
                    } else {
                        newSettings[key] = fetchedSettings[key]
                    }
                })
                setSettings(newSettings)
            } catch (e: any) {
                notification.error({
                    message: "Failed to load settings",
                    description: e.message,
                })
                setLoading(false)
            }
        })()
    }, [])
    const handleSetConfig = async (newConfig: SettingsConfig) => {
        try {
            setLoading(true)
            const res = await guiApi.settings.settingsCreate(newConfig)
            if (res.error) {
                throw new Error(res.error.error)
            }
            notification.success({
                message: "Settings saved",
            })
            setLoading(false)
        } catch (e: any) {
            notification.error({
                message: "Failed to save settings",
                description: e.message,
            })
            setLoading(false)
        }
    };
    return {settings, setSettings: handleSetConfig, loading}
}