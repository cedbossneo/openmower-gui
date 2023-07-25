import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import {useApi} from "../hooks/useApi.ts";
import {Button, Col, notification, Row, Typography} from "antd";
import {useWS} from "../hooks/useWS.ts";
import {useCallback, useEffect, useState} from "react";
import {Gps, Map as MapType} from "../types/ros.ts";
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
    const [api, contextHolder] = notification.useNotification();
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
                        properties: {},
                        geometry: {
                            coordinates: mower_lonlat,
                            type: "Point",
                        }
                    }, ['mower-heading']: {
                        id: "mower-heading",
                        type: "Feature",
                        properties: {},
                        geometry: {
                            coordinates: [mower_lonlat, line],
                            type: "LineString",
                        }
                    }
                }
            })
        });
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
            const feats = parse.WorkingArea?.map((area, index) => {
                return {
                    id: "area-" + index,
                    type: 'Feature',
                    properties: {},
                    geometry: {
                        coordinates: [area.Area?.Points?.map((point) => {
                            return transpose(datumLon, datumLat, point.Y!!, point.X!!)
                        })],
                        type: "Polygon"
                    }
                } as Feature;
            }).reduce((acc, val) => {
                if (val.id == undefined) {
                    return acc
                }
                acc[val.id] = val;
                return acc;
            }, {} as Record<string, Feature>)
            setFeatures(oldFeatures => {
                const newFeatures = {...oldFeatures};
                for (const f of Object.values<Feature>(feats ?? {})) {
                    if (f.id == undefined) {
                        continue
                    }
                    newFeatures[f.id] = f;
                }
                const dock_lonlat = transpose(datumLon, datumLat, parse?.DockY!!, parse?.DockX!!)
                newFeatures["dock"] = {
                    id: "dock",
                    type: "Feature",
                    properties: {},
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

    const onUpdate = useCallback((e: any) => {
        setFeatures(currFeatures => {
            const newFeatures = {...currFeatures};
            for (const f of e.features) {
                if ((f.id as string).length > 20) {
                    const maxArea = Object.values<Feature>(currFeatures).filter((f) => {
                        return (f.id as string).startsWith("area-")
                    }).reduce((acc, val) => {
                        if (val.id == undefined) {
                            return acc
                        }
                        const index = parseInt((val.id as string).substring(5))
                        if (index > acc) {
                            return index
                        }
                        return acc
                    }, 0)
                    let id = "area-" + (maxArea + 1);
                    f.id = id
                    newFeatures[id] = f;
                } else {
                    newFeatures[f.id] = f;
                }
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
    if (datumLon == 0 || datumLat == 0 || Object.keys(features).length == 0 || !map?.MapCenterY || !map?.MapCenterX) {
        return <>Loading</>
    }
    const map_center = (map) ? transpose(datumLon, datumLat, map.MapCenterY!!, map.MapCenterX!!) : [datumLat, datumLon]

    function handleEditMap() {
        setEditMap(!editMap)
    }

    async function handleSaveMap() {
        for (const f of Object.values<Feature>(features)) {
            if (f.id == undefined || !(f.id as string).startsWith("area-")) {
                continue
            }
            const feature = f as Feature<Polygon>
            const points = feature.geometry.coordinates[0].map((point) => {
                return itranspose(datumLon, datumLat, point[1], point[0])
            })
            const area: MowerMapMapArea = {
                area: {
                    points: points.map((point) => {
                        return {
                            x: point[0],
                            y: point[1],
                            z: 0,
                        }
                    })
                }
            }
            try {
                await guiApi.openmower.mapAreaAddCreate({area: area})
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
        for (let i = 0; i < (map?.WorkingArea?.length ?? 0); i++) {
            try {
                await guiApi.openmower.mapAreaDelete(i.toString())
                api.success({
                    message: "Area deleted",
                })
                setEditMap(false)
            } catch (e: any) {
                api.error({
                    message: "Failed to delete area",
                    description: e.message,
                })
            }
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
                        features={Object.values(features)}
                        position="top-left"
                        displayControlsDefault={false}
                        editMode={editMap}
                        controls={{
                            polygon: true,
                            trash: true
                        }}
                        defaultMode="simple_select"
                        onCreate={onUpdate}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                    />
                </Map>
            </Col>
        </Row>
    );
}

export default MapPage;