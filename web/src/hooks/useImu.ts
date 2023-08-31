import {NotificationInstance} from "antd/es/notification/interface";
import {useEffect, useState} from "react";
import {Imu} from "../types/ros.ts";
import {useWS} from "./useWS.ts";

export const useImu = (api: NotificationInstance) => {
    const [imu, setImu] = useState<Imu>({})
    const imuStream = useWS<string>(() => {
            api.info({
                message: "IMU Stream closed",
            })
        }, () => {
            api.info({
                message: "IMU Stream connected",
            })
        },
        (e) => {
            setImu(JSON.parse(e))
        })
    useEffect(() => {
        imuStream.start("/api/openmower/subscribe/imu",)
        return () => {
            imuStream.stop()
        }
    }, []);
    return imu;
};