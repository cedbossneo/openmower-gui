import {NotificationInstance} from "antd/es/notification/interface";
import {useEffect, useState} from "react";
import {WheelTick} from "../types/ros.ts";
import {useWS} from "./useWS.ts";

export const useWheelTicks = (api: NotificationInstance) => {
    const [wheelTicks, setWheelTicks] = useState<WheelTick>({})
    const ticksStream = useWS<string>(() => {
            api.info({
                message: "Wheel Ticks Stream closed",
            })
        }, () => {
            api.info({
                message: "Wheel Ticks Stream connected",
            })
        },
        (e) => {
            setWheelTicks(JSON.parse(e))
        })
    useEffect(() => {
        ticksStream.start("/api/openmower/subscribe/ticks",)
        return () => {
            ticksStream.stop()
        }
    }, []);
    return wheelTicks;
};