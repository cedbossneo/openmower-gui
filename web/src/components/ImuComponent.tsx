import {NotificationInstance} from "antd/es/notification/interface";
import {useEffect, useState} from "react";
import {Imu} from "../types/ros.ts";
import {useWS} from "../hooks/useWS.ts";
import {Col, Row, Statistic} from "antd";

export function ImuComponent(props: { api: NotificationInstance }) {
    const [imu, setImu] = useState<Imu>({})
    const imuStream = useWS<string>(() => {
            props.api.info({
                message: "IMU Stream closed",
            })
        }, () => {
            props.api.info({
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
    return <Row gutter={[16, 16]}>
        <Col lg={8} xs={24}><Statistic precision={9} title="Angular Velocity X"
                                       value={imu.AngularVelocity?.X}/></Col>
        <Col lg={8} xs={24}><Statistic precision={9} title="Angular Velocity Y"
                                       value={imu.AngularVelocity?.Y}/></Col>
        <Col lg={8} xs={24}><Statistic precision={9} title="Angular Velocity Z"
                                       value={imu.AngularVelocity?.Z}/></Col>
        <Col lg={8} xs={24}><Statistic precision={9} title="Linear Acceleration X"
                                       value={imu.LinearAcceleration?.X}/></Col>
        <Col lg={8} xs={24}><Statistic precision={9} title="Linear Acceleration Y"
                                       value={imu.LinearAcceleration?.Y}/></Col>
        <Col lg={8} xs={24}><Statistic precision={9} title="Linear Acceleration Z"
                                       value={imu.LinearAcceleration?.Z}/></Col>
        <Col lg={8} xs={24}><Statistic precision={9} title="Orientation X" value={imu.Orientation?.X}/></Col>
        <Col lg={8} xs={24}><Statistic precision={9} title="Orientation Y" value={imu.Orientation?.Y}/></Col>
        <Col lg={8} xs={24}><Statistic precision={9} title="Orientation Z" value={imu.Orientation?.Z}/></Col>
    </Row>;
}