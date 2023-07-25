import {NotificationInstance} from "antd/es/notification/interface";
import {useApi} from "../hooks/useApi.ts";
import {Card} from "antd";
import AsyncButton from "./AsyncButton.tsx";
import React from "react";

export const MowerActions: React.FC<React.PropsWithChildren<{ api: NotificationInstance }>> = (props) => {
    const guiApi = useApi()
    const handleMowerCommand = (command: string, args: Record<string, any> = {}) => async () => {
        try {
            const res = await guiApi.openmower.callCreate(command, args)
            if (res.error) {
                throw new Error(res.error.error)
            }
            props.api.success({
                message: "Command sent",
            })
        } catch (e: any) {
            props.api.error({
                message: "Unable to send command",
                description: e.message,
            })
        }
    };
    return <Card title={"Actions"}>
        {props.children}
        <AsyncButton size={"small"} type="primary" onAsyncClick={handleMowerCommand("mower_start")}
                     style={{marginRight: 10}}>Start</AsyncButton>
        <AsyncButton size={"small"} onAsyncClick={handleMowerCommand("mower_home")}
                     style={{marginRight: 10}}>Home</AsyncButton>
        <AsyncButton size={"small"} onAsyncClick={handleMowerCommand("mower_s1")}
                     style={{marginRight: 10}}>S1</AsyncButton>
        <AsyncButton size={"small"} onAsyncClick={handleMowerCommand("mower_s2")}
                     style={{marginRight: 10}}>S2</AsyncButton>
        <AsyncButton size={"small"} onAsyncClick={handleMowerCommand("emergency", {emergency: 1})}
                     style={{marginRight: 10}}>Emergency On</AsyncButton>
        <AsyncButton size={"small"} onAsyncClick={handleMowerCommand("mow", {mow_enabled: 1, mow_direction: 0})}
                     style={{marginRight: 10}}>Blade On</AsyncButton>
        <AsyncButton size={"small"} danger onAsyncClick={handleMowerCommand("emergency", {emergency: 0})}
                     style={{marginRight: 10}}>Emergency Off</AsyncButton>
        <AsyncButton size={"small"} danger
                     onAsyncClick={handleMowerCommand("mow", {mow_enabled: 0, mow_direction: 0})}
                     style={{marginRight: 10}}>Blade Off</AsyncButton>
    </Card>;
};