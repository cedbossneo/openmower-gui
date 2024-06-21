import {useApi} from "./useApi.ts";
import {App} from "antd";
import {useEffect, useState} from "react";
import {useConfig} from "./useConfig.tsx";

export enum SettingValueType {
    String = "string",
    Int = "int",
    Float = "float",
    Boolean = "boolean",
    Lat = "lat",
    Lon = "lon",
    Select = "select",
}

export enum SettingType {
    ConfigFile = 0,
    Db = 1,
}

export type Setting = { settingType: SettingType, description: string, help?: string, section: string } & ({
    type: SettingValueType.String,
    defaultValue: string,
} | {
    type: SettingValueType.Boolean,
    defaultValue: boolean,
} | {
    type: SettingValueType.Int,
    defaultValue: number,
} | {
    type: SettingValueType.Float,
    defaultValue: number,
} | {
    type: SettingValueType.Lat,
    defaultValue: number,
} | {
    type: SettingValueType.Lon,
    defaultValue: number,
} | {
    type: SettingValueType.Select,
    defaultValue: string,
    options: { id: string, label: string }[],
})
export const SettingsDesc: Record<string, Setting> = {
    "OM_DATUM_LAT": {
        settingType: SettingType.ConfigFile,
        section: "Datum",
        type: SettingValueType.Lat,
        defaultValue: 43.0,
        description: "Latitude of the datum point",
        help: "This will be your map origin!"
    },
    "OM_DATUM_LONG": {
        settingType: SettingType.ConfigFile,
        section: "Datum",
        type: SettingValueType.Lon,
        defaultValue: 2.0,
        description: "Longitude of the datum point",
        help: "This will be your map origin!"
    },
    "OM_USE_NTRIP": {
        settingType: SettingType.ConfigFile,
        section: "NTRIP",
        type: SettingValueType.Boolean,
        defaultValue: true,
        description: "Use NTRIP to get RTK corrections",
        help: "Set to False if using external radio plugged into the Ardusimple board."
    },
    "OM_NTRIP_HOSTNAME": {
        settingType: SettingType.ConfigFile,
        section: "NTRIP",
        type: SettingValueType.String,
        defaultValue: "192.168.178.55",
        description: "NTRIP server hostname",
    },
    "OM_NTRIP_PORT": {
        settingType: SettingType.ConfigFile,
        section: "NTRIP", type: SettingValueType.Int, defaultValue: 2101, description: "NTRIP server port"},
    "OM_NTRIP_USER": {
        settingType: SettingType.ConfigFile,
        section: "NTRIP",
        type: SettingValueType.String,
        defaultValue: "gps",
        description: "NTRIP server username"
    },
    "OM_NTRIP_PASSWORD": {
        settingType: SettingType.ConfigFile,
        section: "NTRIP",
        type: SettingValueType.String,
        defaultValue: "gps",
        description: "NTRIP server password"
    },
    "OM_NTRIP_ENDPOINT": {
        settingType: SettingType.ConfigFile,
        section: "NTRIP",
        type: SettingValueType.String,
        defaultValue: "BASE1",
        description: "NTRIP server endpoint"
    },
    "OM_MOWER_GAMEPAD": {
        settingType: SettingType.ConfigFile,
        section: "Mower",
        type: SettingValueType.Select, defaultValue: "xbox360", description: "Gamepad type", options: [
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
        settingType: SettingType.ConfigFile,
        section: "Recording",
        type: SettingValueType.Boolean,
        defaultValue: false,
        description: "Enable recording of all topics"
    },
    "OM_PERIMETER_SIGNAL": {
        settingType: SettingType.ConfigFile,
        section: "Mower",
        type: SettingValueType.Boolean,
        defaultValue: false,
        description: "Enable perimeter signal"
    },
    "OM_USE_RELATIVE_POSITION": {
        settingType: SettingType.ConfigFile,
        section: "Positioning",
        type: SettingValueType.Boolean,
        defaultValue: false,
        description: "Use relative position to datum point",
        help: "If set to true, the mower will use the position relative to the datum point. If set to false, the mower will use the absolute position."
    },
    "OM_GPS_PROTOCOL": {
        settingType: SettingType.ConfigFile,
        section: "Positioning",
        type: SettingValueType.Select, defaultValue: "UBX", description: "GPS protocol", options: [
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
    "OM_GPS_BAUDRATE": {
        settingType: SettingType.ConfigFile,
        section: "Positioning",
        type: SettingValueType.Int,
        defaultValue: 921600,
        description: "GPS baudrate"
    },
    "OM_GPS_PORT": {
        settingType: SettingType.ConfigFile,
        section: "Positioning",
        type: SettingValueType.String,
        defaultValue: "/dev/gps",
        description: "GPS port"
    },
    "OM_USE_F9R_SENSOR_FUSION": {
        settingType: SettingType.ConfigFile,
        section: "Positioning",
        help: "If you want to use F9R's sensor fusion, set this to true (you will also need to set DATUM_LAT and DATUM_LONG). If you want to use the GPS position, set this to false.",
        type: SettingValueType.Boolean, defaultValue: false, description: "Use F9R sensor fusion"
    },
    "OM_DOCKING_DISTANCE": {
        settingType: SettingType.ConfigFile,
        section: "Docking",
        type: SettingValueType.Float, defaultValue: 1.0, description: "Distance to dock"
    },
    "OM_UNDOCK_DISTANCE": {
        settingType: SettingType.ConfigFile,
        section: "Docking",
        type: SettingValueType.Float, defaultValue: 2.0, description: "Distance to undock"
    },
    "OM_DOCKING_EXTRA_TIME": {
        settingType: SettingType.ConfigFile,
        section: "Docking",
        type: SettingValueType.Float, defaultValue: 0.0, description: "Extra time (s) to continue docking after detecting voltage"
    },
    "OM_OUTLINE_COUNT": {
        settingType: SettingType.ConfigFile,
        section: "Navigation",
        type: SettingValueType.Int, defaultValue: 4, description: "Number of points in the outline"
    },
    "OM_MOWING_ANGLE_OFFSET": {
        settingType: SettingType.ConfigFile,
        section: "Mower",
        type: SettingValueType.Float, defaultValue: 0, description: "Mowing angle offset"
    },
    "OM_MOWING_ANGLE_INCREMENT": {
        settingType: SettingType.ConfigFile,
        section: "Mower",
        type: SettingValueType.Float, defaultValue: 0.1, description: "Mowing angle increment"
    },
    "OM_MOWING_ANGLE_OFFSET_IS_ABSOLUTE": {
        settingType: SettingType.ConfigFile,
        section: "Mower",
        type: SettingValueType.Boolean,
        defaultValue: false,
        description: "Mowing angle offset is absolute"
    },
    "OM_TOOL_WIDTH": {
        settingType: SettingType.ConfigFile,
        section: "Mower",
        help: "Choose it smaller than your actual mowing tool in order to have some overlap.",
        type: SettingValueType.Float, defaultValue: 0.13, description: "Tool width"
    },
    "OM_BATTERY_EMPTY_VOLTAGE": {
        settingType: SettingType.ConfigFile,
        help: "Voltage for battery to be considered empty",
        section: "Mower",
        type: SettingValueType.Float, defaultValue: 25.0, description: "Battery empty voltage"
    },
    "OM_BATTERY_FULL_VOLTAGE": {
        settingType: SettingType.ConfigFile,
        help: "Voltage for battery to be considered full",
        section: "Mower",
        type: SettingValueType.Float, defaultValue: 28.5, description: "Battery full voltage"
    },
    "OM_BATTERY_CAPACITY_MAH": {
        settingType: SettingType.ConfigFile,
        help: "Battery capacity in mAh",
        section: "Mower",
        type: SettingValueType.Float, defaultValue: 3000.0, description: "Battery capacity"
    },
    "OM_MOWING_MOTOR_TEMP_HIGH": {
        settingType: SettingType.ConfigFile,
        help: "If the temperature of the mowing motor is higher than this value, the mower will stop.",
        section: "Mower",
        type: SettingValueType.Float,
        defaultValue: 80.0,
        description: "Mowing motor temperature high"
    },
    "OM_MOWING_MOTOR_TEMP_LOW": {
        settingType: SettingType.ConfigFile,
        section: "Mower",
        help: "If the temperature of the mowing motor is lower than this value, the mower will start again.",
        type: SettingValueType.Float,
        defaultValue: 40.0,
        description: "Mowing motor temperature low"
    },
    "OM_GPS_WAIT_TIME_SEC": {
        settingType: SettingType.ConfigFile,
        section: "Positioning",
        type: SettingValueType.Float, defaultValue: 10.0, description: "GPS wait time"
    },
    "OM_GPS_TIMEOUT_SEC": {
        settingType: SettingType.ConfigFile,
        section: "Positioning",
        type: SettingValueType.Float, defaultValue: 5.0, description: "GPS timeout"
    },
    "OM_ENABLE_MOWER": {
        settingType: SettingType.ConfigFile,
        section: "Mower",
        type: SettingValueType.Boolean, defaultValue: true, description: "Enable mower"
    },
    "OM_AUTOMATIC_MODE": {
        settingType: SettingType.ConfigFile,
        section: "Mower",
        type: SettingValueType.Select, defaultValue: "0", description: "Automatic mode", options: [
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
        settingType: SettingType.ConfigFile,
        section: "Navigation",
        help: "Offset of the outline from the boundary in meters.",
        type: SettingValueType.Float, defaultValue: 0.05, description: "Outline offset"
    },
    "OM_OUTLINE_OVERLAP_COUNT": {
        settingType: SettingType.ConfigFile,
        section: "Navigation",
        help: "Number of points in the overlap",
        type: SettingValueType.Int, defaultValue: 0, description: "How many outlines should the fill (lanes) overlap"
    },
    "OM_MQTT_ENABLE": {
        settingType: SettingType.ConfigFile,
        section: "OpenMower MQTT",
        type: SettingValueType.Boolean, defaultValue: false, description: "Enable OpenMower MQTT"
    },
    "OM_MQTT_HOSTNAME": {
        settingType: SettingType.ConfigFile,
        section: "OpenMower MQTT",
        type: SettingValueType.String,
        defaultValue: "your_mqtt_broker",
        description: "MQTT broker hostname"
    },
    "OM_MQTT_PORT": {
        settingType: SettingType.ConfigFile,
        section: "OpenMower MQTT",
        type: SettingValueType.Int, defaultValue: 1883, description: "MQTT broker port"
    },
    "OM_MQTT_USER": {
        settingType: SettingType.ConfigFile,
        section: "OpenMower MQTT",
        type: SettingValueType.String, defaultValue: "", description: "MQTT broker username"
    },
    "OM_MQTT_PASSWORD": {
        settingType: SettingType.ConfigFile,
        section: "OpenMower MQTT",
        type: SettingValueType.String, defaultValue: "", description: "MQTT broker password"
    },
    "system.api.addr": {
        settingType: SettingType.Db,
        section: "API",
        type: SettingValueType.String, defaultValue: ":4006", description: "API address"
    },
    "system.api.webDirectory": {
        settingType: SettingType.Db,
        section: "API",
        type: SettingValueType.String, defaultValue: "/app/web", description: "API web directory"
    },
    "system.map.enabled": {
        settingType: SettingType.Db,
        section: "Map",
        type: SettingValueType.Boolean,
        defaultValue: false,
        description: "Enable map tiles",
    },
    "system.map.tileServer": {
        settingType: SettingType.Db,
        section: "Map",
        type: SettingValueType.String,
        defaultValue: "",
        description: "Tile server URL",
    },
    "system.map.tileUri": {
        settingType: SettingType.Db,
        section: "Map",
        type: SettingValueType.String,
        defaultValue: "/tiles/vt/lyrs=s,h&x={x}&y={y}&z={z}",
        description: "Tile server URI",
    },
    "system.mower.configFile": {
        settingType: SettingType.Db,
        section: "Mower",
        type: SettingValueType.String,
        defaultValue: "/config/mower_config.sh",
        description: "Mower config file",
    },
    "system.mqtt.enabled": {
        settingType: SettingType.Db,
        section: "GUI MQTT",
        type: SettingValueType.Boolean,
        defaultValue: false,
        description: "Enable GUI MQTT",
    },
    "system.mqtt.host": {
        settingType: SettingType.Db,
        section: "GUI MQTT",
        type: SettingValueType.String,
        defaultValue: ":1883",
        description: "GUI MQTT host",
    },
    "system.mqtt.prefix": {
        settingType: SettingType.Db,
        section: "GUI MQTT",
        type: SettingValueType.String,
        defaultValue: "/gui",
        description: "GUI MQTT prefix",
    },
    "system.homekit.enabled": {
        settingType: SettingType.Db,
        section: "HomeKit",
        type: SettingValueType.Boolean,
        defaultValue: false,
        description: "Enable HomeKit",
    },
    "system.homekit.pincode": {
        settingType: SettingType.Db,
        section: "HomeKit",
        type: SettingValueType.String,
        defaultValue: "00102003",
        description: "HomeKit Pin Code",
    },
    "system.ros.nodeName": {
        settingType: SettingType.Db,
        section: "ROS",
        type: SettingValueType.String,
        defaultValue: "openmower-gui",
        description: "ROS node name",
    },
    "system.ros.masterUri": {
        settingType: SettingType.Db,
        section: "ROS",
        type: SettingValueType.String,
        defaultValue: "http://localhost:11311",
        description: "ROS master URI",
    },
    "system.ros.nodeHost": {
        settingType: SettingType.Db,
        section: "ROS",
        type: SettingValueType.String,
        defaultValue: "localhost",
        description: "ROS node host",
    }
}
export type SettingsConfig = {
    [P in keyof typeof SettingsDesc]: Record<P, typeof SettingsDesc[P]['defaultValue']>;
}
const SettingKeysFromDB = Object.keys(SettingsDesc).filter((key) => {
    return SettingsDesc[key].settingType === SettingType.Db
})
const flattenConfig = (newConfig: Record<string, any>): Record<string, any> => {
    const flatConfig: Record<string, any> = {}
    Object.keys(newConfig).forEach((key) => {
        // If the value is an object, flatten it recursively
        if (typeof newConfig[key] === "object") {
            const flat = flattenConfig(newConfig[key])
            Object.keys(flat).forEach((subKey) => {
                flatConfig[`${key}.${subKey}`] = flat[subKey]
            })
        } else {
            flatConfig[key] = newConfig[key]
        }
    })
    return flatConfig;
};
export const useSettings = () => {
    const guiApi = useApi()
    const {notification} = App.useApp();
    const db = useConfig(SettingKeysFromDB)
    const [loading, setLoading] = useState<boolean>(false)
    const [settings, setSettings] = useState<Record<keyof typeof SettingsDesc, any>>({})
    useEffect(() => {
        if (db.config) {
            const newSettings: Record<string, any> = {}
            Object.keys(db.config).forEach((key) => {
                if (SettingsDesc[key]?.type === SettingValueType.Boolean) {
                    if (db.config[key] === "true") {
                        newSettings[key] = true
                    } else if (db.config[key] === "false") {
                        newSettings[key] = false
                    }
                } else {
                    newSettings[key] = db.config[key]
                }
            })
            setSettings((prev) => {
                return {...prev, ...newSettings}
            })
        }
    }, [db.config]);
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
                    if (SettingsDesc[key]?.type === SettingValueType.Boolean) {
                        if (fetchedSettings[key] === "True" || fetchedSettings[key] == "1") {
                            newSettings[key] = true
                        } else if (fetchedSettings[key] === "False" || fetchedSettings[key] == "0") {
                            newSettings[key] = false
                        }
                    } else {
                        newSettings[key] = fetchedSettings[key]
                    }
                })
                setSettings((prev) => {
                    return {...prev, ...newSettings}
                })
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
            newConfig = flattenConfig(newConfig)
            setLoading(true)
            const configFiltered = Object.keys(newConfig).reduce((acc, key) => {
                if (SettingsDesc[key]?.settingType === SettingType.ConfigFile) {
                    acc[key] = newConfig[key]
                }
                return acc
            }, {} as SettingsConfig)
            const dbFiltered = Object.keys(newConfig).reduce((acc, key) => {
                if (SettingsDesc[key]?.settingType === SettingType.Db) {
                    if (SettingsDesc[key]?.type === SettingValueType.Boolean) {
                        acc[key] = newConfig[key].toString()
                    } else {
                        acc[key] = newConfig[key]
                    }
                }
                return acc
            }, {} as Record<string, any>)
            const res = await guiApi.settings.settingsCreate(configFiltered)
            if (res.error) {
                throw new Error(res.error.error)
            }
            await db.setConfig(dbFiltered)
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
