import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import {useApi} from "../hooks/useApi.ts";
import {Button, Col, Modal, notification, Row, Typography} from "antd";
import {useWS} from "../hooks/useWS.ts";
import {useCallback, useEffect, useState} from "react";
import {Gps, Map as MapType, MapArea, Quaternion} from "../types/ros.ts";
import DrawControl from "../components/DrawControl.tsx";
import Map from 'react-map-gl';
import type {Feature} from 'geojson';
import {Polygon} from "geojson";
import {MowerActions} from "../components/MowerActions.tsx";
import {MowerMapMapArea} from "../api/Api.ts";
import AsyncButton from "../components/AsyncButton.tsx";

const radians = function (degrees: number) {
    return degrees * Math.PI / 180;
}

/*
function getHeading(quaternion: Quaternion): number {
    return Math.atan2(2.0 * (quaternion.W!! * quaternion.Z!! + quaternion.X!! * quaternion.Y!!), 1.0 - 2.0 * (quaternion.Y!! * quaternion.Y!! + quaternion.Z!! * quaternion.Z!!));
}*/

function getQuaternionFromHeading(heading: number): Quaternion {
    const q = {
        X: 0,
        Y: 0,
        Z: 0,
        W: 0,
    } as Quaternion
    q.W = Math.cos(heading / 2)
    q.Z = Math.sin(heading / 2)
    return q
}

export function drawLine(longitude: number, latitude: number, orientation: number, length: number): [number, number] {
    const endLongitude = longitude + Math.cos(radians(orientation)) * length;
    const endLatitude = latitude + Math.sin(radians(orientation)) * length;

    return [endLongitude, endLatitude];
}

const earth = 6378.137,  //radius of the earth in kilometer
    pi = Math.PI,
    m = (1 / ((2 * pi / 360) * earth)) / 1000;  //1 meter in degree

const transpose = (datumLon: number, datumLat: number, y: number, x: number) => {
    const new_latitude = datumLat + (y * m);
    const new_longitude = datumLon + ((x * m) / Math.cos(datumLat * (pi / 180)));
    return [new_longitude, new_latitude]
};

const itranspose = (datumLon: number, datumLat: number, y: number, x: number) => {
    //Inverse the transpose function
    const new_latitude = (y - datumLat) / m;
    const new_longitude = (x - datumLon) / (m / Math.cos(datumLat * (pi / 180)));
    return [new_longitude, new_latitude]
};

export const MapPage = () => {
    const [api, notificationContextHolder] = notification.useNotification();
    const [modal, contextHolder] = Modal.useModal();

    const guiApi = useApi()
    const [editMap, setEditMap] = useState<boolean>(false)
    const [map, setMap] = useState<MapType | undefined>(undefined)
    const [settings, setSettings] = useState<Record<string, any>>({})
    useEffect(() => {
        (async () => {
            try {
                const settings = await guiApi.settings.settingsList()
                if (settings.error) {
                    throw new Error(settings.error.error)
                }
                setSettings(settings.data.settings ?? {})
            } catch (e: any) {
                api.error({
                    message: "Failed to load settings",
                    description: e.message,
                })
            }
        })()
    }, [])
    useEffect(() => {
        if (editMap) {
            mapStream.stop()
            gpsStream.stop()
        } else {
            if (settings["OM_DATUM_LONG"] == undefined || settings["OM_DATUM_LAT"] == undefined) {
                return
            }
            gpsStream.start("/api/openmower/subscribe/gps",)
            mapStream.start("/api/openmower/subscribe/map",)
        }
    }, [editMap])
    const gpsStream = useWS<string>(() => {
            api.info({
                message: "GPS Stream closed",
            })
        }, () => {
            api.info({
                message: "GPS Stream connected",
            })
        },
        (e) => {
            const gps = JSON.parse(e) as Gps
            const mower_lonlat = transpose(datumLon, datumLat, gps.Pose?.Pose?.Position?.Y!!, gps.Pose?.Pose?.Position?.X!!)
            setFeatures(oldFeatures => {
                const line = drawLine(mower_lonlat[0], mower_lonlat[1], gps.MotionHeading!! * 2 * pi * 10, m / 2)
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

    function buildFeatures(areas: MapArea[] | undefined, type: string) {
        return areas?.flatMap((area, index) => {
            const map = {
                id: type + "-" + index + "-area",
                type: 'Feature',
                properties: {
                    "color": type == "navigation" ? "white" : "#01d30d",
                },
                geometry: {
                    coordinates: [area.Area?.Points?.map((point) => {
                        return transpose(datumLon, datumLat, point.Y!!, point.X!!)
                    })],
                    type: "Polygon"
                }
            } as Feature;
            const obstacles = area.Obstacles?.map((obstacle, index) => {
                return {
                    id: type + "-" + index + "-obstacle",
                    type: 'Feature',
                    properties: {
                        "color": "#ff0000",
                    },
                    geometry: {
                        coordinates: [obstacle.Points?.map((point) => {
                            return transpose(datumLon, datumLat, point.Y!!, point.X!!)
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

    const mapStream = useWS<string>(() => {
            api.info({
                message: "MAP Stream closed",
            })
        }, () => {
            api.info({
                message: "MAP Stream connected",
            })
        },
        (e) => {
            let parse = JSON.parse(e) as MapType;
            setMap(parse)
            console.log(parse)
            const workingAreas = buildFeatures(parse.WorkingArea, "area")
            const navigationAreas = buildFeatures(parse.NavigationAreas, "navigation")
            setFeatures(oldFeatures => {
                const newFeatures = {...oldFeatures, ...workingAreas, ...navigationAreas};
                const dock_lonlat = transpose(datumLon, datumLat, parse?.DockY!!, parse?.DockX!!)
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
                return newFeatures;
            })
        });
    useEffect(() => {
        if (settings["OM_DATUM_LONG"] == undefined || settings["OM_DATUM_LAT"] == undefined) {
            return
        }
        gpsStream.start("/api/openmower/subscribe/gps",)
        mapStream.start("/api/openmower/subscribe/map",)
    }, [settings]);

    useEffect(() => {
        return () => {
            gpsStream.stop()
            mapStream.stop()
        }
    }, [])

    const [features, setFeatures] = useState<Record<string, Feature>>({});

    function getNewId(currFeatures: Record<string, Feature>, type: string, component: string) {
        const maxArea = Object.values<Feature>(currFeatures).filter((f) => {
            let idDetails = (f.id as string).split("-")
            if (idDetails.length != 3) {
                return false
            }
            let areaType = idDetails[0]
            let areaComponent = idDetails[2]
            return areaType == type && component == areaComponent
        }).reduce((acc, val) => {
            let idDetails = (val.id as string).split("-")
            if (idDetails.length != 3) {
                return acc
            }
            let index = parseInt(idDetails[1])
            if (index > acc) {
                return index
            }
            return acc
        }, 0)
        return type + "-" + (maxArea + 1) + "-" + component;
    }

    const onCreate = useCallback((e: any) => {
        for (const f of e.features) {
            modal.confirm({
                title: 'Set the area type',
                content: 'Do you want to set the area as a working area or a navigation area?',
                okText: 'Working area',
                cancelText: 'Navigation area',
                onOk: () => {
                    setFeatures(currFeatures => {
                        let id = getNewId(currFeatures, "area", "area");
                        f.id = id
                        f.properties = {
                            color: "#01d30d",
                        }
                        return {...currFeatures, [id]: f};
                    })
                },
                onCancel: () => {
                    setFeatures(currFeatures => {
                        let id = getNewId(currFeatures, "navigation", "area");
                        f.id = id
                        f.properties = {
                            color: "white",
                        }
                        return {...currFeatures, [id]: f};
                    })
                }
            })
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

    const datumLon = parseFloat(settings["OM_DATUM_LONG"] ?? 0)
    const datumLat = parseFloat(settings["OM_DATUM_LAT"] ?? 0)
    if (datumLon == 0 || datumLat == 0) {
        return <>Loading</>
    }
    const map_center = (map && map.MapCenterY && map.MapCenterX) ? transpose(datumLon, datumLat, map.MapCenterY, map.MapCenterX) : [datumLon, datumLat]

    function handleEditMap() {
        setEditMap(!editMap)
    }

    async function handleSaveMap() {
        const areas: Record<string, Record<string, MowerMapMapArea>> = {}
        for (const f of Object.values<Feature>(features)) {
            let id = f.id as string;
            let idDetails = id.split("-")
            if (idDetails.length != 3) {
                continue
            }
            let type = idDetails[0]
            let index = idDetails[1]
            let component = idDetails[2]
            areas[type] = areas[type] ?? {}
            areas[type][index] = areas[type][index] ?? {}

            const feature = f as Feature<Polygon>
            const points = feature.geometry.coordinates[0].map((point) => {
                return itranspose(datumLon, datumLat, point[1], point[0])
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
            api.success({
                message: "Map deleted",
            })
            setEditMap(false)
        } catch (e: any) {
            api.error({
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
                    api.success({
                        message: "Area saved",
                    })
                    setEditMap(false)
                } catch (e: any) {
                    api.error({
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

    return (
        <Row gutter={[16, 16]}>
            <Col span={24}>
                <Typography.Title level={2}>Map</Typography.Title>
                <Typography.Title level={5} style={{color: "#ff0000"}}>WARNING: Beta, please backup your map before
                    use</Typography.Title>
            </Col>
            <Col span={24}>
                <MowerActions api={api}>
                    {!editMap && <Button size={"small"} type="primary" onClick={handleEditMap}
                                         style={{marginRight: 10}}>Edit Map</Button>}
                    {editMap && <AsyncButton size={"small"} type="primary" onAsyncClick={handleSaveMap}
                                             style={{marginRight: 10}}>Save Map</AsyncButton>}
                    {editMap && <Button size={"small"} onClick={handleEditMap}
                                        style={{marginRight: 10}}>Cancel Map Edition</Button>}
                </MowerActions>
            </Col>
            <Col span={24}>
                {contextHolder}
                {notificationContextHolder}
                <Map
                    mapboxAccessToken="pk.eyJ1IjoiZmFrZXVzZXJnaXRodWIiLCJhIjoiY2pwOGlneGI4MDNnaDN1c2J0eW5zb2ZiNyJ9.mALv0tCpbYUPtzT7YysA2g"
                    initialViewState={{
                        longitude: map_center[0],
                        latitude: map_center[1],
                        zoom: 25,
                    }}
                    style={{width: '80vw', height: '70vh'}}
                    mapStyle="mapbox://styles/mapbox/satellite-v9"
                >
                    <DrawControl
                        styles={[
                            {
                                'id': 'gl-draw-polygon-fill-inactive',
                                'type': 'fill',
                                'filter': ['all',
                                    ['==', 'active', 'false'],
                                    ['==', '$type', 'Polygon'],
                                    ['!=', 'mode', 'static']
                                ],
                                'paint': {
                                    'fill-color': '#3bb2d0',
                                    'fill-outline-color': '#3bb2d0',
                                    'fill-opacity': 0.1
                                }
                            },
                            {
                                'id': 'gl-draw-polygon-fill-active',
                                'type': 'fill',
                                'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
                                'paint': {
                                    'fill-color': '#fbb03b',
                                    'fill-outline-color': '#fbb03b',
                                    'fill-opacity': 0.1
                                }
                            },
                            {
                                'id': 'gl-draw-polygon-midpoint',
                                'type': 'circle',
                                'filter': ['all',
                                    ['==', '$type', 'Point'],
                                    ['==', 'meta', 'midpoint']],
                                'paint': {
                                    'circle-radius': 3,
                                    'circle-color': '#fbb03b'
                                }
                            },
                            {
                                'id': 'gl-draw-polygon-stroke-inactive',
                                'type': 'line',
                                'filter': ['all',
                                    ['==', 'active', 'false'],
                                    ['==', '$type', 'Polygon'],
                                    ['!=', 'mode', 'static']
                                ],
                                'layout': {
                                    'line-cap': 'round',
                                    'line-join': 'round'
                                },
                                'paint': {
                                    'line-color': '#3bb2d0',
                                    'line-width': 2
                                }
                            },
                            {
                                'id': 'gl-draw-polygon-stroke-active',
                                'type': 'line',
                                'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
                                'layout': {
                                    'line-cap': 'round',
                                    'line-join': 'round'
                                },
                                'paint': {
                                    'line-color': '#fbb03b',
                                    'line-dasharray': [0.2, 2],
                                    'line-width': 2
                                }
                            },
                            {
                                'id': 'gl-draw-line-inactive',
                                'type': 'line',
                                'filter': ['all',
                                    ['==', 'active', 'false'],
                                    ['==', '$type', 'LineString'],
                                    ['!=', 'mode', 'static']
                                ],
                                'layout': {
                                    'line-cap': 'round',
                                    'line-join': 'round'
                                },
                                'paint': {
                                    'line-color': '#3bb2d0',
                                    'line-width': 2
                                }
                            },
                            {
                                'id': 'gl-draw-line-active',
                                'type': 'line',
                                'filter': ['all',
                                    ['==', '$type', 'LineString'],
                                    ['==', 'active', 'true']
                                ],
                                'layout': {
                                    'line-cap': 'round',
                                    'line-join': 'round'
                                },
                                'paint': {
                                    'line-color': '#fbb03b',
                                    'line-dasharray': [0.2, 2],
                                    'line-width': 2
                                }
                            },
                            {
                                'id': 'gl-draw-polygon-and-line-vertex-stroke-inactive',
                                'type': 'circle',
                                'filter': ['all',
                                    ['==', 'meta', 'vertex'],
                                    ['==', '$type', 'Point'],
                                    ['!=', 'mode', 'static']
                                ],
                                'paint': {
                                    'circle-radius': 5,
                                    'circle-color': '#fff'
                                }
                            },
                            {
                                'id': 'gl-draw-polygon-and-line-vertex-inactive',
                                'type': 'circle',
                                'filter': ['all',
                                    ['==', 'meta', 'vertex'],
                                    ['==', '$type', 'Point'],
                                    ['!=', 'mode', 'static']
                                ],
                                'paint': {
                                    'circle-radius': 3,
                                    'circle-color': '#fbb03b'
                                }
                            },
                            {
                                'id': 'gl-draw-point-point-stroke-inactive',
                                'type': 'circle',
                                'filter': ['all',
                                    ['==', 'active', 'false'],
                                    ['==', '$type', 'Point'],
                                    ['==', 'meta', 'feature'],
                                    ['!=', 'mode', 'static']
                                ],
                                'paint': {
                                    'circle-radius': 5,
                                    'circle-opacity': 1,
                                    'circle-color': '#fff'
                                }
                            },
                            {
                                'id': 'gl-draw-point-inactive',
                                'type': 'circle',
                                'filter': ['all',
                                    ['==', 'active', 'false'],
                                    ['==', '$type', 'Point'],
                                    ['==', 'meta', 'feature'],
                                    ['!=', 'mode', 'static']
                                ],
                                'paint': {
                                    'circle-radius': 3,
                                    'circle-color': '#3bb2d0'
                                }
                            },
                            {
                                'id': 'gl-draw-point-stroke-active',
                                'type': 'circle',
                                'filter': ['all',
                                    ['==', '$type', 'Point'],
                                    ['==', 'active', 'true'],
                                    ['!=', 'meta', 'midpoint']
                                ],
                                'paint': {
                                    'circle-radius': 7,
                                    'circle-color': '#fff'
                                }
                            },
                            {
                                'id': 'gl-draw-point-active',
                                'type': 'circle',
                                'filter': ['all',
                                    ['==', '$type', 'Point'],
                                    ['!=', 'meta', 'midpoint'],
                                    ['==', 'active', 'true']],
                                'paint': {
                                    'circle-radius': 5,
                                    'circle-color': '#fbb03b'
                                }
                            },
                            {
                                'id': 'gl-draw-polygon-fill-static',
                                'type': 'fill',
                                'filter': ['all', ['==', 'mode', 'static'], ['==', '$type', 'Polygon']],
                                'paint': {
                                    'fill-color': '#404040',
                                    'fill-outline-color': '#404040',
                                    'fill-opacity': 0.1
                                }
                            },
                            {
                                'id': 'gl-draw-polygon-stroke-static',
                                'type': 'line',
                                'filter': ['all', ['==', 'mode', 'static'], ['==', '$type', 'Polygon']],
                                'layout': {
                                    'line-cap': 'round',
                                    'line-join': 'round'
                                },
                                'paint': {
                                    'line-color': '#404040',
                                    'line-width': 2
                                }
                            },
                            {
                                'id': 'gl-draw-line-static',
                                'type': 'line',
                                'filter': ['all', ['==', 'mode', 'static'], ['==', '$type', 'LineString']],
                                'layout': {
                                    'line-cap': 'round',
                                    'line-join': 'round'
                                },
                                'paint': {
                                    'line-color': '#404040',
                                    'line-width': 2
                                }
                            },
                            {
                                'id': 'gl-draw-point-static',
                                'type': 'circle',
                                'filter': ['all', ['==', 'mode', 'static'], ['==', '$type', 'Point']],
                                'paint': {
                                    'circle-radius': 5,
                                    'circle-color': '#404040'
                                }
                            }, {
                                'id': 'gl-draw-polygon-color-picker',
                                'type': 'fill',
                                'filter': ['all',
                                    ['==', 'active', 'false'],
                                    ['==', '$type', 'Polygon'],
                                    ['!=', 'mode', 'static'],
                                    ['has', 'user_color'],
                                ],
                                'paint': {
                                    'fill-color': ['get', 'user_color'],
                                    'fill-outline-color': '#D20C0C',
                                    'fill-opacity': 0.5
                                }
                            },
                            {
                                'id': 'gl-draw-point-color-picker',
                                'type': 'circle',
                                'filter': ['all',
                                    ['==', 'active', 'false'],
                                    ['==', '$type', 'Point'],
                                    ['==', 'meta', 'feature'],
                                    ['!=', 'mode', 'static'],
                                    ['has', 'user_color'],
                                ],
                                'paint': {
                                    'circle-radius': 3,
                                    'circle-color': ['get', 'user_color'],
                                }
                            },
                            {
                                'id': 'gl-draw-line-color-picker',
                                'type': 'line',
                                'filter': ['all',
                                    ['==', 'active', 'false'],
                                    ['==', '$type', 'LineString'],
                                    ['==', 'meta', 'feature'],
                                    ['!=', 'mode', 'static'],
                                    ['has', 'user_color'],
                                ],
                                'paint': {
                                    'line-color': ['get', 'user_color'],
                                }
                            },
                        ]}
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
                </Map>
            </Col>
        </Row>
    );
}

export default MapPage;