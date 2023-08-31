import {NotificationInstance} from "antd/es/notification/interface";
import {useEffect, useState} from "react";
import {HighLevelStatus} from "../types/ros.ts";
import {useWS} from "./useWS.ts";

export const useHighLevelStatus = (api: NotificationInstance) => {
    const [highLevelStatus, setHighLevelStatus] = useState<HighLevelStatus>({})
    const highLevelStatusStream = useWS<string>(() => {
            api.info({
                message: "High Level Status Stream closed",
            })
        }, () => {
            api.info({
                message: "High Level Status Stream connected",
            })
        },
        (e) => {
            setHighLevelStatus(JSON.parse(e))
        })
    useEffect(() => {
        highLevelStatusStream.start("/api/openmower/subscribe/highLevelStatus",)
        return () => {
            highLevelStatusStream.stop()
        }
    }, []);
    return {highLevelStatus, stop: highLevelStatusStream.stop, start: highLevelStatusStream.start};
}