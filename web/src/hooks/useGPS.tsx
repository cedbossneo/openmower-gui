import {NotificationInstance} from "antd/es/notification/interface";
import {useEffect, useState} from "react";
import {Gps} from "../types/ros.ts";
import {useWS} from "./useWS.ts";

export const useGPS = (api: NotificationInstance) => {
    const [gps, setGps] = useState<Gps>({})
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
            setGps(JSON.parse(e))
        })
    useEffect(() => {
        gpsStream.start("/api/openmower/subscribe/gps",)
        return () => {
            gpsStream.stop()
        }
    }, []);
    return gps;
};