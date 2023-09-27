import {useEffect, useState} from "react";
import {AbsolutePose} from "../types/ros.ts";
import {useWS} from "./useWS.ts";

export const useGPS = () => {
    const [gps, setGps] = useState<AbsolutePose>({})
    const gpsStream = useWS<string>(() => {
            console.log({
                message: "GPS Stream closed",

            })
        }, () => {
            console.log({
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