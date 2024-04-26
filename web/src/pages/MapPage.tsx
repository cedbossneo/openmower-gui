import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import {useApi} from "../hooks/useApi.ts";
import {App, Button, Col, Modal, Row, Slider, Typography} from "antd";
import {useWS} from "../hooks/useWS.ts";
// @ts-ignore
import centroid from "@turf/centroid";
import {ChangeEvent, useCallback, useEffect, useMemo, useState} from "react";
import {AbsolutePose, Map as MapType, MapArea, Marker, MarkerArray, Path, Twist} from "../types/ros.ts";
import DrawControl from "../components/DrawControl.tsx";
import Map, {Layer, Source} from 'react-map-gl';
import type {Feature} from 'geojson';
import {FeatureCollection, LineString, Polygon, Position} from "geojson";
import {MowerActions, useMowerAction} from "../components/MowerActions.tsx";
import {MowerMapMapArea} from "../api/Api.ts";
import AsyncButton from "../components/AsyncButton.tsx";
import {MapStyle} from "./MapStyle.tsx";
import {converter, drawLine, getQuaternionFromHeading, itranspose, transpose} from "../utils/map.tsx";
import {Joystick} from "react-joystick-component";
import {useHighLevelStatus} from "../hooks/useHighLevelStatus.ts";
import {IJoystickUpdateEvent} from "react-joystick-component/build/lib/Joystick";
import {useSettings} from "../hooks/useSettings.ts";
import {useConfig} from "../hooks/useConfig.tsx";
import {useEnv} from "../hooks/useEnv.tsx";
import {Spinner} from "../components/Spinner.tsx";
import AsyncDropDownButton from "../components/AsyncDropDownButton.tsx";

var offsetXTimeout: any = null;
var offsetYTimeout: any = null;

export const MapPage = () => {
    const {notification} = App.useApp();
    const mowerAction = useMowerAction()
    const highLevelStatus = useHighLevelStatus()
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [modalOpen, setModalOpen] = useState<boolean>(false)
    const [currentFeature, setCurrentFeature] = useState<Feature | undefined>(undefined)

    const {settings} = useSettings()
    const [labelsCollection, setLabelsCollection] = useState<FeatureCollection>({
        type: "FeatureCollection",
        features: []
    })
    const {config, setConfig} = useConfig(["gui.map.offset.x", "gui.map.offset.y"])
    const envs = useEnv()
    const guiApi = useApi()
    const [manualMode, setManualMode] = useState<number | undefined>()
    const [tileUri, setTileUri] = useState<string | undefined>()
    const [editMap, setEditMap] = useState<boolean>(false)
    const [features, setFeatures] = useState<Record<string, Feature>>({});
    const [mapKey, setMapKey] = useState<string>("origin")
    const [map, setMap] = useState<MapType | undefined>(undefined)
    const [path, setPath] = useState<MarkerArray | undefined>(undefined)
    const [plan, setPlan] = useState<Path | undefined>(undefined)
    const mowingToolWidth = parseFloat(settings["OM_TOOL_WIDTH"] ?? "0.13") * 100;
    const [mowingAreas, setMowingAreas] = useState<{ key: string, label: string, feat: Feature }[]>([])
    const poseStream = useWS<string>(() => {
            console.log({
                message: "Pose Stream closed",
            })
        }, () => {
            console.log({
                message: "Pose Stream connected",
            })
        },
        (e) => {
            const pose = JSON.parse(e) as AbsolutePose
            const mower_lonlat = transpose(offsetX, offsetY, datum, pose.Pose?.Pose?.Position?.Y!!, pose.Pose?.Pose?.Position?.X!!)
            setFeatures(oldFeatures => {
                let orientation = pose.MotionHeading!!;
                const line = drawLine(offsetX, offsetY, datum, pose.Pose?.Pose?.Position?.Y!!, pose.Pose?.Pose?.Position?.X!!, orientation);
                return {
                    ...oldFeatures, mower: {
                        id: "mower",
                        type: "Feature",
                        properties: {
                            "color": "#00a6ff",
                        },
                        geometry: {
                            coordinates: mower_lonlat,
                            type: "Point",
                        }
                    }, ['mower-heading']: {
                        id: "mower-heading",
                        type: "Feature",
                        properties: {
                            "color": "#ff0000",
                        },
                        geometry: {
                            coordinates: [mower_lonlat, line],
                            type: "LineString",
                        }
                    }
                }
            })
        });

    const mapStream = useWS<string>(() => {
            console.log({
                message: "MAP Stream closed",
            })
        }, () => {
            console.log({
                message: "MAP Stream connected",
            })
        },
        (e) => {
            let parse = JSON.parse(e) as MapType;
            setMap(parse)
            setMapKey("live")
        });

    const pathStream = useWS<string>(() => {
            console.log({
                message: "PATH Stream closed",
            })
        }, () => {
            console.log({
                message: "PATH Stream connected",
            })
        },
        (e) => {
            let parse = JSON.parse(e) as MarkerArray;
            setPath(parse)
        });
    const planStream = useWS<string>(() => {
            console.log({
                message: "PLAN Stream closed",
            })
        }, () => {
            console.log({
                message: "PLAN Stream connected",
            })
        },
        (e) => {
            let parse = JSON.parse(e) as Path;
            setPlan(parse)
        });
    const mowingPathStream = useWS<string>(() => {
            console.log({
                message: "Mowing PATH Stream closed",
            })
        }, () => {
            console.log({
                message: "Mowing PATH Stream connected",
            })
        },
        (e) => {
            const mowingPaths = JSON.parse(e) as Path[];
            setFeatures(oldFeatures => {
                const newFeatures = {...oldFeatures};
                mowingPaths.forEach((mowingPath, index) => {
                    if (mowingPath?.Poses) {
                        newFeatures["mowingPath-" + index] = {
                            id: "mowingPath-" + index,
                            type: 'Feature',
                            properties: {
                                color: `rgba(107, 255, 188, 0.68)`,
                                width: mowingToolWidth,
                            },
                            geometry: {
                                coordinates: mowingPath.Poses.map((pose) => {
                                    return transpose(offsetX, offsetY, datum, pose.Pose?.Position?.Y!, pose.Pose?.Position?.X!)
                                }),
                                type: "LineString"
                            }
                        };
                    }
                })
                return newFeatures
            })
        });

    const joyStream = useWS<string>(() => {
            console.log({
                message: "Joystick Stream closed",
            })
        }, () => {
            console.log({
                message: "Joystick Stream connected",
            })
        },
        () => {
        });

    useEffect(() => {
        if (envs) {
            setTileUri(envs.tileUri)
        }
    }, [envs]);

    useEffect(() => {
        let offX = parseFloat(config["gui.map.offset.x"] ?? 0);
        let offY = parseFloat(config["gui.map.offset.y"] ?? 0);
        if (!isNaN(offX)) {
            setOffsetX(offX)
        }
        if (!isNaN(offY)) {
            setOffsetY(offY)
        }
    }, [config]);

    useEffect(() => {
        if (editMap) {
            mapStream.stop()
            poseStream.stop()
            pathStream.stop()
            planStream.stop()
            mowingPathStream.stop()
            highLevelStatus.stop()
            setPath(undefined)
            setPlan(undefined)
        } else {
            if (settings["OM_DATUM_LONG"] == undefined || settings["OM_DATUM_LAT"] == undefined) {
                return
            }
            highLevelStatus.start("/api/openmower/subscribe/highLevelStatus")
            poseStream.start("/api/openmower/subscribe/pose",)
            mapStream.start("/api/openmower/subscribe/map",)
            pathStream.start("/api/openmower/subscribe/path")
            planStream.start("/api/openmower/subscribe/plan")
            mowingPathStream.start("/api/openmower/subscribe/mowingPath")
        }
    }, [editMap])
    useEffect(() => {
        if (highLevelStatus.highLevelStatus.StateName == "AREA_RECORDING") {
            joyStream.start("/api/openmower/publish/joy")
            setEditMap(false)
            return
        }
        joyStream.stop()
    }, [highLevelStatus.highLevelStatus.StateName])

    useEffect(() => {
        if (settings["OM_DATUM_LONG"] == undefined || settings["OM_DATUM_LAT"] == undefined) {
            return
        }
        highLevelStatus.start("/api/openmower/subscribe/highLevelStatus")
        poseStream.start("/api/openmower/subscribe/pose",)
        mapStream.start("/api/openmower/subscribe/map",)
        pathStream.start("/api/openmower/subscribe/path")
        planStream.start("/api/openmower/subscribe/plan")
        mowingPathStream.start("/api/openmower/subscribe/mowingPath")
    }, [settings]);

    useEffect(() => {
        return () => {
            poseStream.stop()
            mapStream.stop()
            pathStream.stop()
            joyStream.stop()
            planStream.stop()
            mowingPathStream.stop()
            highLevelStatus.stop()
        }
    }, [])

    const buildLabels = (param: Feature[]) => {
        return param.flatMap((feature) => {
            if (feature.properties?.title == undefined) {
                return []
            }
            if (feature.geometry.type !== "Polygon") {
                return []
            }
            if (feature.geometry.coordinates.length == 0) {
                return []
            }
            const centroidPt = centroid(feature);
            centroidPt.properties.title = feature.properties?.title;
            centroidPt.id = feature.id
            return [centroidPt];
        })
    };
    useEffect(() => {
        let newFeatures: Record<string, Feature> = {}
        if (map) {
            const workingAreas = buildFeatures(map.WorkingArea, "area")
            const navigationAreas = buildFeatures(map.NavigationAreas, "navigation")
            newFeatures = {...workingAreas, ...navigationAreas}
            const labels = buildLabels(Object.values(newFeatures))
            setLabelsCollection({
                type: "FeatureCollection",
                features: labels
            });
            setMowingAreas(labels.flatMap(feat => {
                if (feat.properties?.title == undefined) {
                    return []
                }
                return [{
                    key: feat.id as string,
                    label: feat.properties?.title,
                    feat
                }]
            }))
            const dock_lonlat = transpose(offsetX, offsetY, datum, map?.DockY!!, map?.DockX!!)
            newFeatures["dock"] = {
                id: "dock",
                type: "Feature",
                properties: {
                    "color": "#ff00f2",
                },
                geometry: {
                    coordinates: dock_lonlat,
                    type: "Point",
                }
            }
        }
        if (path) {
            Object.values<Marker>(path.Markers).filter((f) => {
                return f.Type == 4 && f.Action == 0
            }).forEach((marker, index) => {
                const line: Position[] = marker.Points.map(point => {
                    return transpose(offsetX, offsetY, datum, point.Y!!, point.X!!)
                })
                const feature: Feature<LineString> = {
                    id: "path-" + index,
                    type: 'Feature',
                    properties: {
                        color: `rgba(${marker.Color.R * 255}, ${marker.Color.G * 255}, ${marker.Color.B * 255}, ${marker.Color.A * 255})`
                    },
                    geometry: {
                        coordinates: line,
                        type: 'LineString'
                    }
                }
                newFeatures[feature.id as string] = feature
                return feature
            })
        }
        if (plan?.Poses) {
            const feature: Feature<LineString> = {
                id: "plan",
                type: 'Feature',
                properties: {
                    color: `orange`,
                    width: 3,
                },
                geometry: {
                    coordinates: plan.Poses.map((pose) => {
                        return transpose(offsetX, offsetY, datum, pose.Pose?.Position?.Y!, pose.Pose?.Position?.X!)
                    }),
                    type: "LineString"
                }
            }
            newFeatures[feature.id as string] = feature
        }
        setFeatures(newFeatures)
    }, [map, path, plan, offsetX, offsetY]);

    function buildFeatures(areas: MapArea[] | undefined, type: string) {
        return areas?.flatMap((area, index) => {
            if (!area.Area?.Points?.length) {
                return []
            }
            const map = {
                id: type + "-" + index + "-area-0",
                type: 'Feature',
                properties: {
                    "color": type == "navigation" ? "white" : "#01d30d",
                    title: type == "area" ? type + " " + index : undefined,
                    index,
                },
                geometry: {
                    coordinates: [area.Area?.Points?.map((point) => {
                        return transpose(offsetX, offsetY, datum, point.Y!!, point.X!!)
                    })],
                    type: "Polygon"
                }
            } as Feature;
            const obstacles = area.Obstacles?.map((obstacle, oindex) => {
                return {
                    id: type + "-" + index + "-obstacle-" + oindex,
                    type: 'Feature',
                    properties: {
                        "color": "#bf0000",
                    },
                    geometry: {
                        coordinates: [obstacle.Points?.map((point) => {
                            return transpose(offsetX, offsetY, datum, point.Y!!, point.X!!)
                        })],
                        type: "Polygon"
                    }
                } as Feature;
            })
            return [map, ...obstacles ?? []]
        }).reduce((acc, val) => {
            if (val.id == undefined) {
                return acc
            }
            acc[val.id] = val;
            return acc;
        }, {} as Record<string, Feature>);
    }


    function getNewId(currFeatures: Record<string, Feature>, type: string, index: string | null, component: string) {
        let maxArea = 0
        if (index != null) {
            maxArea = parseInt(index) - 1
        } else {
            maxArea = Object.values<Feature>(currFeatures).filter((f) => {
                let idDetails = (f.id as string).split("-")
                if (idDetails.length != 4) {
                    return false
                }
                let areaType = idDetails[0]
                let areaComponent = idDetails[2]
                return areaType == type && component == areaComponent
            }).reduce((acc, val) => {
                let idDetails = (val.id as string).split("-")
                if (idDetails.length != 4) {
                    return acc
                }
                let index = parseInt(idDetails[1])
                if (index > acc) {
                    return index
                }
                return acc
            }, 0)
        }
        const maxComponent = Object.values<Feature>(currFeatures).filter((f) => {
            return (f.id as string).startsWith(type + "-" + (maxArea + 1) + "-" + component + "-")
        }).reduce((acc, val) => {
            let idDetails = (val.id as string).split("-")
            if (idDetails.length != 4) {
                return acc
            }
            let index = parseInt(idDetails[3])
            if (index > acc) {
                return index
            }
            return acc
        }, 0)
        return type + "-" + (maxArea + 1) + "-" + component + "-" + maxComponent + 1;
    }

    function saveNavigationArea() {
        if (currentFeature == undefined) {
            return
        }
        setFeatures(currFeatures => {
            let id = getNewId(currFeatures, "navigation", null, "area");
            currentFeature.id = id
            currentFeature.properties = {
                color: "white",
            }
            return {...currFeatures, [id]: currentFeature};
        })
        setCurrentFeature(undefined)
        setModalOpen(false)
    }

    function saveMowingArea() {
        if (currentFeature == undefined) {
            return
        }
        setFeatures(currFeatures => {
            let id = getNewId(currFeatures, "area", null, "area");
            currentFeature.id = id
            currentFeature.properties = {
                color: "#01d30d",
            }
            return {...currFeatures, [id]: currentFeature};
        })
        setCurrentFeature(undefined)
        setModalOpen(false)
    }

    const inside = (currentLayerCoordinates: Position[], areaCoordinates: Position[]) => {
        let inside = false;
        let j = areaCoordinates.length - 1;
        for (let i = 0; i < areaCoordinates.length; i++) {
            const xi = areaCoordinates[i][0];
            const yi = areaCoordinates[i][1];
            const xj = areaCoordinates[j][0];
            const yj = areaCoordinates[j][1];

            const intersect = ((yi > currentLayerCoordinates[1][1]) !== (yj > currentLayerCoordinates[1][1]))
                && (currentLayerCoordinates[1][0] < (xj - xi) * (currentLayerCoordinates[1][1] - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
            j = i;
        }
        return inside;
    };

    function deleteFeature() {
        if (currentFeature == undefined) {
            return
        }
        setFeatures(currFeatures => {
            const newFeatures = {...currFeatures};
            delete newFeatures[currentFeature.id!!]
            return newFeatures
        })
        setCurrentFeature(undefined)
        setModalOpen(false)
    }

    function saveObstacle() {
        if (currentFeature == undefined) {
            return
        }
        setFeatures(currFeatures => {
            const currentLayerCoordinates = (currentFeature as Feature<Polygon>).geometry.coordinates[0]
            // find the area that contains the obstacle
            const area = Object.values<Feature>(currFeatures).find((f) => {
                if (f.geometry.type != "Polygon") {
                    return false
                }
                const areaCoordinates = (f as Feature<Polygon>).geometry.coordinates[0]
                return inside(currentLayerCoordinates, areaCoordinates)
            })
            if (!area) {
                return currFeatures
            }
            const areaType = (area.id as string).split("-")[0]
            const areaIndex = (area.id as string).split("-")[1]
            let id = getNewId(currFeatures, areaType, areaIndex, "obstacle");
            currentFeature.id = id
            currentFeature.properties = {
                color: "#bf0000",
            }
            return {...currFeatures, [id]: currentFeature} as Record<string, Feature>;
        })
        setCurrentFeature(undefined)
        setModalOpen(false)
    }

    const onCreate = useCallback((e: any) => {
        for (const f of e.features) {
            setCurrentFeature(f)
            setModalOpen(true)
        }
    }, []);

    const onUpdate = useCallback((e: any) => {
        setFeatures(currFeatures => {
            const newFeatures = {...currFeatures};
            for (const f of e.features) {
                newFeatures[f.id] = f;
            }
            return newFeatures;
        });
    }, []);

    const onDelete = useCallback((e: any) => {
        setFeatures(currFeatures => {
            const newFeatures = {...currFeatures};
            for (const f of e.features) {
                delete newFeatures[f.id];
            }
            return newFeatures;
        });
    }, []);

    const _datumLon = parseFloat(settings["OM_DATUM_LONG"] ?? 0)
    const _datumLat = parseFloat(settings["OM_DATUM_LAT"] ?? 0)
    const [map_ne, map_sw, datum] = useMemo<[[number, number], [number, number], [number, number, number]]>(() => {
        if (_datumLon == 0 || _datumLat == 0) {
            return [[0, 0], [0, 0], [0, 0, 0]]
        }
        const datum: [number, number, number] = [0, 0, 0]
        converter.LLtoUTM(_datumLat, _datumLon, datum)
        const map_center = (map && map.MapCenterY && map.MapCenterX) ? transpose(offsetX, offsetY, datum, map.MapCenterY, map.MapCenterX) : [_datumLon, _datumLat]
        const center: [number, number, number] = [0, 0, 0]
        converter.LLtoUTM(map_center[1], map_center[0], center)
        const map_sw = transpose(offsetX, offsetY, center, -((map?.MapHeight ?? 10) / 2), -((map?.MapWidth ?? 10) / 2))
        const map_ne = transpose(offsetX, offsetY, center, ((map?.MapHeight ?? 10) / 2), ((map?.MapWidth ?? 10) / 2))
        return [map_ne, map_sw, datum]
    }, [_datumLat, _datumLon, map, offsetX, offsetY])

    function handleEditMap() {
        setEditMap(!editMap)
    }

    async function handleSaveMap() {
        const areas: Record<string, Record<string, MowerMapMapArea>> = {}
        for (const f of Object.values<Feature>(features)) {
            let id = f.id as string;
            let idDetails = id.split("-")
            if (idDetails.length != 4) {
                continue
            }
            let type = idDetails[0]
            let index = idDetails[1]
            let component = idDetails[2]
            areas[type] = areas[type] ?? {}
            areas[type][index] = areas[type][index] ?? {}

            const feature = f as Feature<Polygon>
            const points = feature.geometry.coordinates[0].map((point) => {
                return itranspose(offsetX, offsetY, datum, point[1], point[0])
            })
            if (component == "area") {
                areas[type][index].area = {
                    points: points.map((point) => {
                        return {
                            x: point[0],
                            y: point[1],
                            z: 0,
                        }
                    })
                }
            } else if (component == "obstacle") {
                areas[type][index].obstacles = [...(areas[type][index].obstacles ?? []), {
                    points: points.map((point) => {
                        return {
                            x: point[0],
                            y: point[1],
                            z: 0,
                        }
                    })
                }]
            }
        }
        try {
            await guiApi.openmower.deleteOpenmower()
            notification.success({
                message: "Map deleted",
            })
            setEditMap(false)
        } catch (e: any) {
            notification.error({
                message: "Failed to delete map",
                description: e.message,
            })
        }
        for (const [type, areasOfType] of Object.entries(areas)) {
            for (const [_, area] of Object.entries(areasOfType)) {
                try {
                    await guiApi.openmower.mapAreaAddCreate({
                        area: area,
                        isNavigationArea: type == "navigation",
                    })
                    notification.success({
                        message: "Area saved",
                    })
                    setEditMap(false)
                } catch (e: any) {
                    notification.error({
                        message: "Failed to save area",
                        description: e.message,
                    })
                }
            }
        }
        if (!map) {
            await guiApi.openmower.mapDockingCreate({
                dockingPose: {
                    orientation: {
                        x: 0,
                        y: 0,
                        z: 0,
                        w: 1,
                    },
                    position: {
                        x: 0,
                        y: 0,
                        z: 0,
                    }
                }
            })
        } else {
            let quaternionFromHeading = getQuaternionFromHeading(map?.DockHeading!!);
            await guiApi.openmower.mapDockingCreate({
                dockingPose: {
                    orientation: {
                        x: quaternionFromHeading.X!!,
                        y: quaternionFromHeading.Y!!,
                        z: quaternionFromHeading.Z!!,
                        w: quaternionFromHeading.W!!,
                    },
                    position: {
                        x: map?.DockX!!,
                        y: map?.DockY!!,
                        z: 0,
                    }
                }
            })
        }

    }

    const handleBackupMap = () => {
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.style.display = "none";
        const json = JSON.stringify(map),
            blob = new Blob([json], {type: "octet/stream"}),
            url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = "map.json";
        a.click();
        window.URL.revokeObjectURL(url);
    };
    const handleRestoreMap = () => {
        /*<input id="file-input" type="file" name="name" style="display: none;" />*/
        const input = document.createElement("input");
        input.type = "file";
        input.style.display = "none";
        document.body.appendChild(input);
        input.addEventListener('change', (event) => {
            setEditMap(true)
            const file = (event as unknown as ChangeEvent<HTMLInputElement>).target?.files?.[0];
            if (!file) {
                return;
            }
            const reader = new FileReader();
            reader.addEventListener('load', (event) => {
                let content = event.target?.result as string;
                let parts = content.split(",");
                let newMap = JSON.parse(atob(parts[1])) as MapType;
                setMap(newMap)
            });
            reader.readAsDataURL(file);
        })
        input.click();
    };
    const handleManualMode = async () => {
        await mowerAction(
            "high_level_control",
            {
                Command: 3,
            }
        )()
        setManualMode(setInterval(() => {
            (async () => {
                await mowerAction("mow_enabled", {MowEnabled: 1, MowDirection: 0})()
            })()
        }, 10000))
    };

    const handleStopManualMode = async () => {
        await mowerAction(
            "high_level_control",
            {
                Command: 2,
            }
        )()
        clearInterval(manualMode)
        setManualMode(undefined)
        await mowerAction("mow_enabled", {MowEnabled: 0, MowDirection: 0})()
    };

    const handleJoyMove = (event: IJoystickUpdateEvent) => {
        let newVar: Twist = {
            Linear: {
                X: event.y ?? 0,
                Y: 0,
                Z: 0
            },
            Angular: {
                Z: (event.x ?? 0) * -1,
                X: 0,
                Y: 0
            }
        };
        joyStream.sendJsonMessage(newVar)
    };
    const handleJoyStop = () => {
        let newVar: Twist = {
            Linear: {
                X: 0,
                Y: 0,
                Z: 0
            },
            Angular: {
                Z: 0,
                X: 0,
                Y: 0
            }
        };
        joyStream.sendJsonMessage(newVar)
    };

    const handleOffsetX = (value: number) => {
        if (offsetXTimeout != null) {
            clearTimeout(offsetXTimeout)
        }
        offsetXTimeout = setTimeout(() => {
            (async () => {
                try {
                    await setConfig({
                        "gui.map.offset.x": value.toString(),
                    })
                } catch (e: any) {
                    notification.error({
                        message: "Failed to save offset",
                        description: e.message,
                    })
                }
            })()
        }, 1000)
        setOffsetX(value)
    }
    const handleOffsetY = (value: number) => {
        if (offsetYTimeout != null) {
            clearTimeout(offsetYTimeout)
        }
        offsetYTimeout = setTimeout(() => {
            (async () => {
                try {
                    await setConfig({
                        "gui.map.offset.y": value.toString(),
                    })
                } catch (e: any) {
                    notification.error({
                        message: "Failed to save offset",
                        description: e.message,
                    })
                }
            })()
        }, 1000)
        setOffsetY(value)
    }

    if (_datumLon == 0 || _datumLat == 0) {
        return <Spinner/>
    }
    return (
        <Row gutter={[16, 16]} align={"top"} style={{height: '100%'}}>
            <Modal
                open={modalOpen}
                title={"Set the area type"}
                footer={[
                    <Button style={{paddingRight: 10}} key="mowing" type="primary" onClick={saveMowingArea}>
                        Working area
                    </Button>,
                    <Button style={{paddingRight: 10}} key="navigation" onClick={saveNavigationArea}>
                        Navigation area
                    </Button>,
                    <Button style={{paddingRight: 10}} key="obstacle" onClick={saveObstacle}>
                        Obstacle
                    </Button>,
                    <Button key="cancel" onClick={deleteFeature}>
                        Cancel
                    </Button>,
                ]}
                onOk={saveMowingArea}
                onCancel={deleteFeature}
            />
            <Col span={24}>
                <Typography.Title level={2}>Map</Typography.Title>
                <Typography.Title level={5} style={{color: "#ff0000"}}>WARNING: Beta, please backup your map before
                    use</Typography.Title>
            </Col>
            <Col span={24}>
                <MowerActions>
                    {!editMap && <Button size={"small"} type="primary" onClick={handleEditMap}
                    >Edit Map</Button>}
                    {editMap && <AsyncButton size={"small"} type="primary" onAsyncClick={handleSaveMap}
                    >Save Map</AsyncButton>}
                    {editMap && <Button size={"small"} onClick={handleEditMap}
                    >Cancel Map Edition</Button>}
                    <AsyncDropDownButton size={"small"} menu={{
                        items: mowingAreas,
                        onAsyncClick: (e) => {
                            const item = mowingAreas.find(item => item.key == e.key)
                            return mowerAction("start_in_area", {
                                area: item!!.feat.properties?.index,
                            })()
                        }
                    }}>Mow area</AsyncDropDownButton>
                    {!manualMode &&
                        <AsyncButton size={"small"} onAsyncClick={handleManualMode}
                        >Manual mowing</AsyncButton>}
                    {manualMode &&
                        <AsyncButton size={"small"} onAsyncClick={handleStopManualMode}
                        >Stop Manual Mowing</AsyncButton>}
                    <Button size={"small"} onClick={handleBackupMap}
                    >Backup Map</Button>
                    <Button size={"small"} onClick={handleRestoreMap}
                    >Restore Map</Button>
                </MowerActions>
            </Col>
            <Col span={24}>
                <Row>
                    <Col span={12}>
                        <Slider value={offsetX} onChange={handleOffsetX} min={-30} max={30} step={0.01}/>
                    </Col>
                    <Col span={12}>
                        <Slider value={offsetY} onChange={handleOffsetY} min={-30} max={30} step={0.01}/>
                    </Col>
                </Row>
            </Col>
            <Col span={24} style={{height: '70%'}}>
                {map_sw?.length && map_ne?.length ? <Map key={mapKey}
                                                         reuseMaps
                                                         antialias
                                                         projection={{
                                                             name: "globe"
                                                         }}
                                                         mapboxAccessToken="pk.eyJ1IjoiZmFrZXVzZXJnaXRodWIiLCJhIjoiY2pwOGlneGI4MDNnaDN1c2J0eW5zb2ZiNyJ9.mALv0tCpbYUPtzT7YysA2g"
                                                         initialViewState={{
                                                             bounds: [{lng: map_sw[0], lat: map_sw[1]}, {lng: map_ne[0], lat: map_ne[1]}],
                                                         }}
                                                         style={{width: '100%', height: '100%'}}
                                                         mapStyle={"mapbox://styles/mapbox/satellite-streets-v12"}
                >
                    {tileUri ? <Source type={"raster"} id={"custom-raster"} tiles={[tileUri]} tileSize={256}/> : null}
                    {tileUri ? <Layer type={"raster"} source={"custom-raster"} id={"custom-layer"}/> : null}
                    <Source type={"geojson"} id={"labels"} data={labelsCollection}/>
                    <Layer type={"symbol"} id={"mower"} source={"labels"} layout={{
                        "text-field": ['get', 'title'], //This will get "t" property from your geojson
                        "text-rotation-alignment": "auto",
                        "text-allow-overlap": true,
                        "text-anchor": "top"
                    }} paint={{
                        "text-color": "black",
                    }}/>
                    <DrawControl
                        styles={MapStyle}
                        userProperties={true}
                        features={Object.values(features)}
                        position="top-left"
                        displayControlsDefault={false}
                        editMode={editMap}
                        controls={{
                            polygon: true,
                            trash: true
                        }}
                        defaultMode="simple_select"
                        onCreate={onCreate}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                    />
                </Map> : <Spinner/>}
                {highLevelStatus.highLevelStatus.StateName === "AREA_RECORDING" &&
                    <div style={{position: "absolute", bottom: 30, right: 30, zIndex: 100}}>
                        <Joystick move={handleJoyMove} stop={handleJoyStop}/>
                    </div>}
            </Col>
        </Row>
    );
}

//MapPage.whyDidYouRender = true

export default MapPage;