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
    let actionMenuItems: {
        key: string,
        label: string,
        actions: { command: string, args: any }[],
        danger?: boolean
    }[] = [
        {
            key: "mower_s1",
            label: "S1",
            actions: [{
                command: "high_level_control",
                args: {
                    Command: 3,
                }
            }]
        },
        {
            key: "mower_s2",
            label: "S2",
            actions: [{
                command: "high_level_control",
                args: {
                    Command: 4,
                }
            }]
        },
        {
            key: "pause",
            label: "Pause",
            actions: [{
                command: "mower_logic", args: {
                    Config: {
                        Bools: [{
                            Name: "manual_pause_mowing",
                            Value: true
                        }]
                    }
                }
            }]
        },
        {
            key: "continue",
            label: "Continue",
            actions: [{
                command: "mower_logic", args: {
                    Config: {
                        Bools: [{
                            Name: "manual_pause_mowing",
                            Value: false
                        }]
                    }
                }
            }, {
                command: "high_level_control",
                args: {
                    Command: 1,
                }
            }]
        },
        {
            "key": "emergency_off",
            "label": "Emergency Off",
            "danger": true,
            actions: [{
                command: "emergency",
                args: {
                    Emergency: 0,
                }
            }]
        },
        {
            "key": "mow_forward",
            "label": "Blade Forward",
            actions: [{
                command: "mow_enabled",
                args: {MowEnabled: 1, MowDirection: 0}
            }]
        },
        {
            "key": "mow_backward",
            "label": "Blade Backward",
            actions: [{
                command: "mow_enabled",
                args: {MowEnabled: 1, MowDirection: 1}
            }]
        },
        {
            "key": "mow_off",
            "label": "Blade Off",
            "danger": true,
            actions: [{
                command: "mow_enabled",
                args: {MowEnabled: 0, MowDirection: 0}
            }]
        },
    ];
    return <ActionsCard title={"Actions"} size={"small"}>
        {props.children}
        {props.children ? <Divider type={"vertical"} style={{marginRight: 20}}/> : null}
        <AsyncButton size={"small"} type="primary" onAsyncClick={handleMowerCommand("high_level_control", {Command: 1})}
                     style={{marginRight: 10}}>Start</AsyncButton>
        <AsyncButton size={"small"} onAsyncClick={handleMowerCommand("high_level_control", {Command: 2})}
                     style={{marginRight: 10}}>Home</AsyncButton>
        <AsyncButton danger size={"small"} onAsyncClick={handleMowerCommand("emergency", {Emergency: 1})}
                     style={{marginRight: 10}}>Emergency On</AsyncButton>
        <AsyncDropDownButton style={{display: "inline"}} size={"small"} menu={{
            items: actionMenuItems,
            onAsyncClick: async (e) => {
                const item = actionMenuItems.find(item => item.key == e.key)
                for (const action of (item?.actions ?? [])) {
                    await handleMowerCommand(action.command, action.args)();
                }
            }
        }}>
            More
        </AsyncDropDownButton>
    </ActionsCard>;
};