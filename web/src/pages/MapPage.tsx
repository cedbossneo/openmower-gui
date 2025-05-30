import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import {useApi} from "../hooks/useApi.ts";
import {App, Button, Col, Input, Modal, Row, Slider, Typography} from "antd";
import {useWS} from "../hooks/useWS.ts";
import centroid from "@turf/centroid";
import union from "@turf/union";
import {featureCollection} from "@turf/helpers"
import {ChangeEvent, useCallback, useEffect, useMemo, useState} from "react";
import {AbsolutePose, Map as MapType, MapArea, Marker, MarkerArray, Path, Twist} from "../types/ros.ts";
import DrawControl from "../components/DrawControl.tsx";
import Map, {Layer, Source} from 'react-map-gl';
import type {Feature} from 'geojson';
import {FeatureCollection, Polygon, Position} from "geojson";
import {MowerActions, useMowerAction} from "../components/MowerActions.tsx";
import {MowerMapMapArea,MowerReplaceMapSrvReq} from "../api/Api.ts";
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
import {MowingFeature, MowingAreaFeature, MowerFeatureBase, DockFeatureBase, MowingFeatureBase, LineFeatureBase, NavigationFeature, ObstacleFeature, ActivePathFeature, PathFeature } from "../types/map.ts";


var offsetXTimeout: any = null;
var offsetYTimeout: any = null;

class mowingAreaEdit  {
    id?: string;
    name: string;
    mowing_order: number;
    orig_mowing_order: number;
    index: number;
    //feature?: MowingAreaFeature

    constructor() {
        this.name ='';
        this.mowing_order = 9999;
        this.orig_mowing_order = 9999;
        this.index =-1;
    }
}


export const MapPage = () => {
    const {notification} = App.useApp();
    const mowerAction = useMowerAction()
    const highLevelStatus = useHighLevelStatus()
    const [offsetX, setOffsetX] = useState(0);
    const [offsetY, setOffsetY] = useState(0);
    const [modalOpen, setModalOpen] = useState<boolean>(false)
    const [areaModelOpen, setAreaModelOpen] = useState<boolean>(false)
    
    const [currentFeature, setCurrentFeature] = useState<Feature | undefined>(undefined)
    const [curMowingAreaFeature, setCurMowingAreaFeature] = useState<mowingAreaEdit>(new mowingAreaEdit())

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
    const [features, setFeatures] = useState<Record<string, MowingFeature>>({});
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
                    ...oldFeatures, mower: new MowerFeatureBase(mower_lonlat) 
                    , ['mower-heading']: new LineFeatureBase("mower-heading", [mower_lonlat, line],'#ff0000','heading')
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
            if(console.debug)
                console.debug(parse);
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
                        const line = mowingPath.Poses.map((pose) => {
                            return transpose(offsetX, offsetY, datum, pose.Pose?.Position?.Y!, pose.Pose?.Position?.X!)
                        });
                        newFeatures["mowingPath-" + index.toString()] = new PathFeature("mowingPath-" + index.toString(), line, `rgba(107, 255, 188, 0.68)`, mowingToolWidth);
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

    const buildLabels = (param: MowingFeature[]) => {
        return param.flatMap((feature) => {

            if (!(feature instanceof MowingAreaFeature)) {
                return []
            }
            const centroidPt = centroid(feature);
            if (centroidPt.properties != null) {
                centroidPt.properties.title = feature.getLabel();
                centroidPt.properties.index = feature.getIndex()
            }
            centroidPt.id = feature.id
            return [centroidPt];
        })
    };
    useEffect(() => {
        let newFeatures: Record<string, MowingFeature> = {}
        if (map) {
            const workingAreas = buildFeatures(map.WorkingArea??[], "area")
            const navigationAreas = buildFeatures(map.NavigationAreas??[], "navigation")
            newFeatures = {...workingAreas, ...navigationAreas}
            

            const dock_lonlat = transpose(offsetX, offsetY, datum, map?.DockY!!, map?.DockX!!)
            newFeatures["dock"] = new DockFeatureBase(dock_lonlat);


        }
        if (path) {
            Object.values<Marker>(path.Markers).filter((f) => {
                return f.Type == 4 && f.Action == 0
            }).forEach((marker, index) => {
                const line: Position[] = marker.Points?.map(point => {
                    return transpose(offsetX, offsetY, datum, point.Y!!, point.X!!)
                })

                const feature = new PathFeature("path-" + index.toString(), line, `rgba(${marker.Color.R * 255}, ${marker.Color.G * 255}, ${marker.Color.B * 255}, ${marker.Color.A * 255})`);
                newFeatures[feature.id] = feature

            })
        }
        if (plan?.Poses) {
            const coordinates = plan.Poses.map((pose) => {
                return transpose(offsetX, offsetY, datum, pose.Pose?.Position?.Y!, pose.Pose?.Position?.X!)
            });
            const feature = new ActivePathFeature("plan", coordinates);
            newFeatures[feature.id] = feature
        }
        if (console.debug) {
            console.debug("Set new features");
            console.debug(newFeatures);
        }
        setFeatures(newFeatures)
    }, [map, path, plan, offsetX, offsetY]);

    useEffect(() => {
        const labels = buildLabels(Object.values(features))
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
                feat: feat,
                index: feat.properties?.index
            }]
        }))
    }, [features]);

    function buildFeatures(areas: MapArea[], type: string) : Record<string, MowingFeatureBase> {


        return areas?.flatMap((area, index) : MowingFeatureBase[] => {
            if (!area.Area?.Points?.length) {
                return []
            }

            const nfeat = type=="area" ? new MowingAreaFeature(type + "-" + index.toString() + "-area-0", index+1)
                : new NavigationFeature(type + "-" + index.toString() + "-area-0");//, offsetX, offsetY, datum.
            nfeat.setArea(area, offsetX, offsetY, datum);

            let obstacles:  ObstacleFeature[] = [];

            if ((nfeat instanceof MowingAreaFeature) && (area.Obstacles))
                obstacles = area.Obstacles.map((obstacle, oindex) => {
                const nobst =  new ObstacleFeature(
                    type + "-" + index.toString() + "-obstacle-" + oindex.toString(),
                    nfeat
                );
                
                if (obstacle.Points)
                    nobst.transpose(obstacle.Points, offsetX, offsetY, datum);

                return nobst;

            })
            return [nfeat, ...obstacles ]
        }).reduce((acc, val) :Record<string, MowingFeatureBase> => {
            if (val.id == undefined) {
                return acc
            }
            acc[val.id] = val;
            return acc;
        }, {} as Record<string, MowingFeatureBase>);
    }

  


    function getNewId(currFeatures: Record<string, MowingFeature>, type: string, index: string | null, component: string) {
        let maxArea = 0
        if (index != null) {
            maxArea = parseInt(index) - 1
        } else {
            maxArea = Object.values<MowingFeature>(currFeatures).filter((f) => {
                const idDetails = (f.id).split("-")
                if (idDetails.length != 4) {
                    return false
                }
                const areaType = idDetails[0]
                const areaComponent = idDetails[2]
                return areaType == type && component == areaComponent
            }).reduce((acc, val) => {
                const idDetails = (val.id).split("-")
                if (idDetails.length != 4) {
                    return acc
                }
                const index = parseInt(idDetails[1])
                if (index > acc) {
                    return index
                }
                return acc
            }, 0)
        }
        const maxComponent = Object.values<MowingFeature>(currFeatures).filter((f) => {
            return (f.id).startsWith(type + "-" + (maxArea + 1).toString() + "-" + component + "-")
        }).reduce((acc, val) => {
            const idDetails = (val.id).split("-")
            if (idDetails.length != 4) {
                return acc
            }
            const index = parseInt(idDetails[3])
            if (index > acc) {
                return index
            }
            return acc
        }, 0)
        return type + "-" + (maxArea + 1).toString() + "-" + component + "-" + (maxComponent + 1).toString();
    }


    function addArea<T extends MowingFeatureBase>(type: string, constructcb: (id: string) => T|null, new_feature: Feature<Polygon>|undefined=undefined) {
         let f;

        if (new_feature== undefined)
            f = currentFeature;
        else 
            f = new_feature;

        if (f == undefined) {
            return
        }

        if (f.geometry.type != 'Polygon')
            return;

        setFeatures(currFeatures => {
            const id = getNewId(currFeatures, type, null, "area");
            const nfeat =  constructcb(id);
            if (!nfeat) {
                return features;
            }
            nfeat.setGeometry((f as Feature<Polygon>).geometry)
            
            return {...currFeatures, [id]: nfeat};
        })
        setCurrentFeature(undefined)
        setModalOpen(false)
    }

    function addObstacle(new_feature: Feature<Polygon>|undefined=undefined) {


        addArea<ObstacleFeature>("area", (id) => {
            const currentLayerCoordinates = (currentFeature as Feature<Polygon>).geometry.coordinates[0]
            // find the area that contains the obstacle
            const area = Object.values<MowingFeature>(features).find((f) => {
                if (!(f instanceof MowingAreaFeature)) {
                    return false
                }
                const areaCoordinates = f.geometry.coordinates[0]
                return inside(currentLayerCoordinates, areaCoordinates)
            })
            if (!area) {
                notification.info({
                    message: "Unable to match an area for this obstacle"});
                return null;
            }

            return  new ObstacleFeature(id, area as MowingAreaFeature);
        }, new_feature);
    }

    function addNavigationArea(new_feature: Feature<Polygon>|undefined=undefined) {
        addArea<NavigationFeature>("navigation", (id) => {
            return  new NavigationFeature(id);
        }, new_feature);
    }

    function addMowingArea(new_feature: Feature<Polygon>|undefined=undefined) {
        addArea<NavigationFeature>("area", (id) => {
            return  new MowingAreaFeature(id, mowingAreas.length+1);
        }, new_feature);
    }



    function handleSaveMowingAreaClick() {
        addMowingArea();
    } 

    function handleSaveNavigationAreaClick() {
        addNavigationArea();
    } 

    function handleSaveObstacleClick() {
        addObstacle();
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


                const feature = newFeatures[f.id] as MowingAreaFeature;
                if (!(feature instanceof MowingAreaFeature))
                    continue;

                if ((f.geometry.type=='Polygon'))
                        feature.setGeometry(f.geometry);
            }
            return newFeatures;
        });
    }, []);

    const onCombine = useCallback((e: any) => {

            const firstDeleted = e.deletedFeatures[0] as Feature<Polygon>;
            const areaType = firstDeleted?.properties?.feature_type as string;
            const coordinates = union(featureCollection(e.deletedFeatures));

            if ((coordinates != null) && (coordinates.geometry.type=='Polygon')) {
                const f ={
                    id:'',
                    properties: firstDeleted.properties,
                    geometry: coordinates.geometry,
                    type: "Feature"
                } as Feature<Polygon>;

                switch (areaType) {
                    case 'workarea':
                        addMowingArea(f);
                        break;
                    case 'navigation':
                        addNavigationArea(f);
                        break;
                    case 'obstacle':
                        addObstacle(f);
                        break;
                    default:
                        notification.error({
                            message: `Unknown type ${areaType}`
                        })
                        setFeatures({...features});//revert
                        return;
                }
            }
            else {
                notification.error({
                    message: 'Unable to combine areas. Do they overlap?'
                })
                setFeatures({...features});//revert
                return;
            }

            setFeatures(currFeatures => {
                const newFeatures = {...currFeatures};
                for (const f of e.deletedFeatures) {
                    delete newFeatures[f.id];
                }
    
                sortFeatures(newFeatures)
                return newFeatures;
            });
    },[addMowingArea, addNavigationArea, addObstacle, features, notification]);

    function sortFeatures(tosort: Record<string, MowingFeature>,  curMowingAreaFeature: mowingAreaEdit|undefined = undefined) {
        /* sort the mowing areas by mowing order. If there is a duplicate decide the order based on the area (curMowingAreaFeature) that the user 
        added. */
        

        const idxorder = Object.values(tosort).sort((a: MowingFeature,b: MowingFeature ) => {
            if ((a instanceof MowingAreaFeature) && (!(b instanceof MowingAreaFeature)))
                return -1;

            if ((b instanceof MowingAreaFeature) && (!(a instanceof MowingAreaFeature)))
                return 1;

            if (!(b instanceof MowingAreaFeature) || (!(a instanceof MowingAreaFeature)))
                return 0;

            if (a.getMowingOrder() == b.getMowingOrder()) {
                if (curMowingAreaFeature) {

                    return (((a.id == curMowingAreaFeature.id) && (curMowingAreaFeature.orig_mowing_order < curMowingAreaFeature.mowing_order)) 
                        || ((b.id == curMowingAreaFeature.id) && (curMowingAreaFeature.orig_mowing_order > curMowingAreaFeature.mowing_order)) ) ? 1 :-1;
                }
                else {
                    console.warn("Duplicate mowing order detected");
                    return -1;
                }
            }

            return a.getMowingOrder() > b.getMowingOrder()? 1 :-1;

        });

        console.log(idxorder);
        let i = 1;
        idxorder.map(e=> {
            if (e instanceof MowingAreaFeature){
                e.properties.mowing_order = i; 
                i++;
            }
        })
    }

    function updateMowingArea() {
        if ((!curMowingAreaFeature) || (!curMowingAreaFeature.id) )
            return;
    
        setAreaModelOpen(false);
        const newFeatures = {...features} as Record<string, MowingFeature>;
        const f = newFeatures[curMowingAreaFeature.id];
        if ((! f) || (!(f instanceof MowingAreaFeature)))
            return;

        f.setName(curMowingAreaFeature.name);

        if (curMowingAreaFeature.mowing_order != curMowingAreaFeature.orig_mowing_order){

            f.setMowingOrder(curMowingAreaFeature.mowing_order);
            sortFeatures(newFeatures, curMowingAreaFeature);
        }
        setFeatures(newFeatures)

        const labels = buildLabels(Object.values(newFeatures))
        setLabelsCollection({
            type: "FeatureCollection",
            features: labels
        });
 
        //setCurMowingAreaFeature(undefined)
        setAreaModelOpen(false);
    }


    const onOpenDetails = useCallback((e: any) => {
        if ((!e) || (!e.feature) || (!e.feature.id))
            return;

        const feature = e.feature as Feature<Polygon>;
        if (!feature) 
            return;

        if (feature.properties?.feature_type != 'workarea') { 
            notification.info({
                message: "Unable to edit this area"});
            return;
        }
        /* we can' t access features here, assume this area exists for now */
        setCurMowingAreaFeature(
            { id            : feature.id
            , index         : feature.properties.index
            , name          : feature.properties.name
            , mowing_order  : feature.properties.mowing_order
            , orig_mowing_order  : feature.properties.mowing_order} as mowingAreaEdit);

        setAreaModelOpen(true);
    }, [notification]);

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


    function cancelAreaModal() {
        setAreaModelOpen(false);
    }

    async function handleSaveMap() {
        const areas: Record<string, MowerMapMapArea[]> = {
            "area":[],
            "navigation":[],
        }
        const sorted =  Object.values<MowingFeature>(features).sort((a: MowingFeature,b: MowingFeature): number => {
            if ((a instanceof MowingFeatureBase) && (!(b instanceof MowingFeatureBase)))
                return -1;

            if ((b instanceof MowingFeatureBase) && (!(a instanceof MowingFeatureBase)))
                return 1;

            if ((b instanceof MowingFeatureBase) && ((a instanceof MowingFeatureBase)))
                return a.properties.mowing_order > b.properties.mowing_order ? 1 :-1;

            return 0;
        })


        for (const [i,f] of Object.entries(sorted)) {
            if (f instanceof MowingFeatureBase) {

                const idDetails = f.id.split("-")
                if (idDetails.length != 4) {
                    if (console.error)
                        console.error("Invalid id " + f.id);
                    continue
                }
                const type = idDetails[0]

                if (!areas[type])
                    throw Error("Unable to find area type " + type);

                let index = parseInt(i);
                if (f instanceof ObstacleFeature)
                    index = f.getMowingArea().getIndex();  
                else {
                    areas[type][index] = {
                        name:  f.properties?.name ?? ''
                    }
                } 

                const points = f.geometry.coordinates[0].map((point) => {
                    return itranspose(offsetX, offsetY, datum, point[1], point[0])
                });

                
       

                if ((f instanceof MowingAreaFeature)||(f instanceof NavigationFeature))  {
                    areas[type][index].area = {
                    
                        points: points.map((point) => {
                            return {
                                x: point[0],
                                y: point[1],
                                z: 0,
                            }
                        })
                    }
                } else if (f instanceof ObstacleFeature) {
                    if (!areas[type][index])
                        throw Error("Unable to find area " + index.toString());

            
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
        }
     

        const updateMsg : MowerReplaceMapSrvReq = {
            areas : []
        };
        for (const [type, areasOfType] of Object.entries(areas)) {
            for (const [_, area] of Object.entries(areasOfType)) {
                const narea = {
                    area: area,
                    isNavigationArea: type == "navigation",
                };
                updateMsg.areas.push(narea);

            }
        }
        try {
            await guiApi.openmower.mapReplace(updateMsg)
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

    const handleDownloadGeoJSON = () => {
        const geojson = {
            type: "FeatureCollection",
            features: Object.values(features)
        };
        const a = document.createElement("a");
        document.body.appendChild(a);
        a.style.display = "none";
        const json = JSON.stringify(geojson),
            blob = new Blob([json], { type: "application/geo+json" }),
            url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = "map.geojson";
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleUploadGeoJSON = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.style.display = "none";
        document.body.appendChild(input);
        input.addEventListener('change', (event) => {
            const file = (event as unknown as ChangeEvent<HTMLInputElement>).target?.files?.[0];
            if (!file) {
                return;
            }
            const reader = new FileReader();
            /*reader.onload = (event) => {
                const geojson = JSON.parse(event.target?.result as string) as FeatureCollection;
                const newFeatures = geojson.features.reduce((acc, feature) => {
                    acc[feature.id as string] = feature;
                    return acc;
                }, {} as Record<string, Feature>);
                setFeatures(newFeatures);
            };*/
            reader.readAsText(file);
        });
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
                    <Button style={{paddingRight: 10}} key="mowing" type="primary" onClick={handleSaveMowingAreaClick}>
                        Working area
                    </Button>,
                    <Button style={{paddingRight: 10}} key="navigation" onClick={handleSaveNavigationAreaClick}>
                        Navigation area
                    </Button>,
                    <Button style={{paddingRight: 10}} key="obstacle" onClick={handleSaveObstacleClick}>
                        Obstacle
                    </Button>,
                    <Button key="cancel" onClick={deleteFeature}>
                        Cancel
                    </Button>,
                ]}
                onOk={handleSaveMowingAreaClick}
                onCancel={deleteFeature}
            />

            <Modal
                open={areaModelOpen}
                title={"Edit area properties of " + (curMowingAreaFeature.name)}
                footer={[
                    <Button style={{paddingRight: 10}} key="area" onClick={updateMowingArea}  type="primary">
                        Save
                    </Button>,
                ]}
                onCancel={cancelAreaModal}>
                <label>
                    Mowing order
                    <Input style={{paddingRight: 10}} key="mowingorder" name="mowingorder" onChange={
                        (e) => {setCurMowingAreaFeature({...curMowingAreaFeature, mowing_order:  parseInt(e.target.value)})}} value={ 
                            curMowingAreaFeature.mowing_order
                            }/>
                </label>
                <label>
                    Area Name
                    <Input style={{paddingRight: 10}} key="areaname" name="areaname" onChange={
                        (e) => {setCurMowingAreaFeature({...curMowingAreaFeature, name:  e.target.value})}} value={ 
                            curMowingAreaFeature.name
                            } placeholder="Name of the area"/>
                </label>
            </Modal>

            <Col span={24}>
                <Typography.Title level={2}>Map</Typography.Title>
                <Typography.Title level={5} style={{color: "#ff0000"}}>
                    WARNING: Beta, please backup your map before use
                </Typography.Title>
            </Col>
            
            <Col span={24}>
                <MowerActions>
                    {!editMap && <Button size={"small"} key="btnEdit" type="primary" onClick={handleEditMap}
                    >Edit Map</Button>}
                    {editMap && <AsyncButton size={"small"} key="btnSave"  type="primary" onAsyncClick={handleSaveMap}
                    >Save Map</AsyncButton>}
                    {editMap && <Button size={"small"} key="btnCancel" onClick={handleEditMap}
                    >Cancel Map Edition</Button>}
                    {!editMap && 
                    <AsyncDropDownButton size={"small"}  key="slctAreas"  menu={{
                        items: mowingAreas,
                        onAsyncClick: (e) => {
                            const item = mowingAreas.find(item => item.key == e.key)                            
                            return mowerAction("start_in_area", {
                                area: item!!.index,
                            })()
                        }
                    }}>Mow area</AsyncDropDownButton>}
                    {!manualMode &&
                        <AsyncButton size={"small"}  key="btnManualMode"  onAsyncClick={handleManualMode}
                        >Manual mowing</AsyncButton>}
                    {manualMode &&
                        <AsyncButton size={"small"}  key="btnAutoMode"  onAsyncClick={handleStopManualMode}
                        >Stop Manual Mowing</AsyncButton>}
                    <Button size={"small"} key="btnBackup" onClick={handleBackupMap}
                    >Backup Map</Button>
                    <Button size={"small"} key="btnRestore" onClick={handleRestoreMap}
                    >Restore Map</Button>
                    <Button size={"small"} key="btnDownloadGeo" onClick={handleDownloadGeoJSON}
                    >Download GeoJSON</Button>
                    {editMap && <Button size={"small"} key="btnUploadGeo" onClick={handleUploadGeoJSON}>Upload GeoJSON</Button>}
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
                                                         mapboxAccessToken="pk.eyJ1IjoiY2VkYm9zc25lbyIsImEiOiJjbGxldjB4aDEwOW5vM3BxamkxeWRwb2VoIn0.WOccbQZZyO1qfAgNxnHAnA"
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
                            trash: true,
                            combine_features: true,
                        }}
                        defaultMode="simple_select"
                        onCreate={onCreate}
                        onUpdate={onUpdate}
                        onCombine={onCombine}
                        onDelete={onDelete}
                        onOpenDetails={onOpenDetails}
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
