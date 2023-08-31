import {NotificationInstance} from "antd/es/notification/interface";
import {useEffect, useState} from "react";
import {Status} from "../types/ros.ts";
import {useWS} from "./useWS.ts";

export const useStatus = (api: NotificationInstance) => {
    const [status, setStatus] = useState<Status>({})
    const statusStream = useWS<string>(() => {
            api.info({
                message: "Status Stream closed",
            })
        }, () => {
            api.info({
                message: "Status Stream connected",
            })
        },
        (e) => {
            setStatus(JSON.parse(e))
        })
    useEffect(() => {
        statusStream.start("/api/openmower/subscribe/status",)
        return () => {
            statusStream.stop()
        }
    }, []);
    return status;
};