import {NotificationInstance} from "antd/es/notification/interface";
import {useEffect, useState} from "react";
import {HighLevelStatus} from "../types/ros.ts";
import {useWS} from "../hooks/useWS.ts";
import {Col, Row, Statistic} from "antd";
import {booleanFormatter, progressFormatter, stateRenderer} from "./utils.tsx";

export function HighLevelStatusComponent(props: { api: NotificationInstance }) {
    const [highLevelStatus, setHighLevelStatus] = useState<HighLevelStatus>({})
    const highLevelStatusStream = useWS<string>(() => {
            props.api.info({
                message: "High Level Status Stream closed",
            })
        }, () => {
            props.api.info({
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
    return <Row gutter={[16, 16]}>
        <Col lg={6} xs={12}><Statistic title="State" valueStyle={{color: '#3f8600'}}
                                       value={stateRenderer(highLevelStatus.StateName)}/></Col>
        <Col lg={6} xs={12}><Statistic title="GPS Quality" value={(highLevelStatus.GpsQualityPercent ?? 0) * 100}
                                       suffix={"%"}/></Col>
        <Col lg={6} xs={12}><Statistic title="Battery" value={(highLevelStatus.BatteryPercent ?? 0) * 100}
                                       formatter={progressFormatter}/></Col>
        <Col lg={6} xs={12}><Statistic title="Charging" value={highLevelStatus.IsCharging ? "Yes" : "No"}
                                       formatter={booleanFormatter}/></Col>
        <Col lg={6} xs={12}><Statistic title="Emergency" value={highLevelStatus.Emergency ? "Yes" : "No"}
                                       formatter={booleanFormatter}/></Col>
    </Row>;
}