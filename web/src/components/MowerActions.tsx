import {NotificationInstance} from "antd/es/notification/interface";
import {useApi} from "../hooks/useApi.ts";
import {Card, Divider} from "antd";
import AsyncButton from "./AsyncButton.tsx";
import React from "react";
import styled from "styled-components";
import AsyncDropDownButton from "./AsyncDropDownButton.tsx";

const ActionsCard = styled(Card)`
  .ant-card-body > button {
    margin-right: 10px;
    margin-bottom: 10px;
  }
`;

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
    let actionMenuItems = [
        {
            key: "mower_s1",
            label: "S1",
        },
        {
            key: "mower_s2",
            label: "S2",
        },
        {
            "key": "emergency_off",
            "label": "Emergency Off",
            "danger": true,
        },
        {
            "key": "mow_forward",
            "label": "Blade Forward",
        },
        {
            "key": "mow_backward",
            "label": "Blade Backward",
        },
        {
            "key": "mow_off",
            "label": "Blade Off",
            "danger": true,
        },
    ];
    return <ActionsCard title={"Actions"} size={"small"}>
        {props.children}
        {props.children ? <Divider type={"vertical"} style={{marginRight: 20}}/> : null}
        <AsyncButton size={"small"} type="primary" onAsyncClick={handleMowerCommand("mower_start")}
                     style={{marginRight: 10}}>Start</AsyncButton>
        <AsyncButton size={"small"} onAsyncClick={handleMowerCommand("mower_home")}
                     style={{marginRight: 10}}>Home</AsyncButton>
        <AsyncButton danger size={"small"} onAsyncClick={handleMowerCommand("emergency", {emergency: 1})}
                     style={{marginRight: 10}}>Emergency On</AsyncButton>
        <AsyncDropDownButton style={{display: "inline"}} size={"small"} menu={{
            items: actionMenuItems,
            onAsyncClick: (e) => {
                switch (e.key) {
                    case "emergency_off":
                        return handleMowerCommand("emergency", {emergency: 0})();
                    case "mow_forward":
                        return handleMowerCommand("mow", {mow_enabled: 1, mow_direction: 0})();
                    case "mow_backward":
                        return handleMowerCommand("mow", {mow_enabled: 1, mow_direction: 1})();
                    case "mow_off":
                        return handleMowerCommand("mow", {mow_enabled: 0})();
                    default:
                        return handleMowerCommand(e.key)();
                }
            }
        }}>
            More
        </AsyncDropDownButton>
    </ActionsCard>;
};