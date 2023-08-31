import {NotificationInstance} from "antd/es/notification/interface";
import {useApi} from "../hooks/useApi.ts";
import {Card, Col, Divider, Row, Statistic} from "antd";
import AsyncButton from "./AsyncButton.tsx";
import React from "react";
import styled from "styled-components";
import AsyncDropDownButton from "./AsyncDropDownButton.tsx";
import {HighLevelStatus} from "../types/ros.ts";
import {booleanFormatter, progressFormatterSmall, stateRenderer} from "./utils.tsx";

const ActionsCard = styled(Card)`
  .ant-card-body > button {
    margin-right: 10px;
    margin-bottom: 10px;
  }
`;

export const useMowerAction = () => {
    const guiApi = useApi()
    return (command: string, args: Record<string, any> = {}) => async () => {
        try {
            const res = await guiApi.openmower.callCreate(command, args)
            if (res.error) {
                throw new Error(res.error.error)
            }
        } catch (e: any) {
            throw new Error(e.message)
        }
    };
};

export const MowerActions: React.FC<React.PropsWithChildren<{ api: NotificationInstance, highLevelStatus: HighLevelStatus, showStatus?: boolean }>> = (props) => {
    const mowerAction = useMowerAction()
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
            key: props.highLevelStatus.StateName == "IDLE" ? "continue" : "pause",
            label: props.highLevelStatus.StateName == "IDLE" ? "Continue" : "Pause",
            actions: props.highLevelStatus.StateName == "IDLE" ? [{
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
            }] : [{
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
        <Row>
            {props.children ? <Col>
                {props.children}
                <Divider type={"vertical"} style={{marginRight: 20}}/>
            </Col> : null}
            <Col>
                {props.highLevelStatus.StateName == "IDLE" ? <AsyncButton size={"small"} type="primary"
                                                                          onAsyncClick={mowerAction("high_level_control", {Command: 1})}
                                                                          style={{marginRight: 10}}>Start</AsyncButton> : null}
                {props.highLevelStatus.StateName !== "IDLE" ? <AsyncButton size={"small"} type="primary"
                                                                           onAsyncClick={mowerAction("high_level_control", {Command: 2})}
                                                                           style={{marginRight: 10}}>Home</AsyncButton> : null}
                {!props.highLevelStatus.Emergency ?
                    <AsyncButton danger size={"small"} onAsyncClick={mowerAction("emergency", {Emergency: 1})}
                                 style={{marginRight: 10}}>Emergency On</AsyncButton> : null}
                {props.highLevelStatus.Emergency ?
                    <AsyncButton danger size={"small"} onAsyncClick={mowerAction("emergency", {Emergency: 1})}
                                 style={{marginRight: 10}}>Emergency Off</AsyncButton> : null}
                <AsyncDropDownButton style={{display: "inline"}} size={"small"} menu={{
                    items: actionMenuItems,
                    onAsyncClick: async (e) => {
                        const item = actionMenuItems.find(item => item.key == e.key)
                        for (const action of (item?.actions ?? [])) {
                            await mowerAction(action.command, action.args)();
                        }
                    }
                }}>
                    More
                </AsyncDropDownButton>
            </Col>
            {props.showStatus ? <Col>
                <Row gutter={[16, 16]}>
                    <Divider type={"vertical"} style={{marginLeft: 20}}/>
                    <Col><Statistic prefix="State :" valueStyle={{color: '#3f8600', fontSize: "14px"}}
                                    value={stateRenderer(props.highLevelStatus.StateName)}/></Col>
                    <Col><Statistic prefix="GPS Quality :" valueStyle={{fontSize: "14px"}} precision={2}
                                    value={(props.highLevelStatus.GpsQualityPercent ?? 0) * 100}
                                    suffix={"%"}/></Col>
                    <Col><Statistic prefix="Battery :" valueStyle={{fontSize: "14px"}} precision={2}
                                    value={(props.highLevelStatus.BatteryPercent ?? 0) * 100}
                                    formatter={progressFormatterSmall}/></Col>
                    <Col><Statistic prefix="Charging :" valueStyle={{fontSize: "14px"}}
                                    value={props.highLevelStatus.IsCharging ? "Yes" : "No"}
                                    formatter={booleanFormatter}/></Col>
                </Row>
            </Col> : null}
        </Row>
    </ActionsCard>;
};