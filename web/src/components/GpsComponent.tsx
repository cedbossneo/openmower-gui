import {NotificationInstance} from "antd/es/notification/interface";
import {useEffect, useState} from "react";
import {Gps} from "../types/ros.ts";
import {useWS} from "../hooks/useWS.ts";
import {Col, Row, Statistic} from "antd";

export function GpsComponent(props: { api: NotificationInstance }) {
    const [gps, setGps] = useState<Gps>({})
    const gpsStream = useWS<string>(() => {
            props.api.info({
                message: "GPS Stream closed",
            })
        }, () => {
            props.api.info({
                message: "GPS Stream connected",
            })
        },
        (e) => {
            setGps(JSON.parse(e))
        })
    useEffect(() => {
        gpsStream.start("/api/openmower/subscribe/gps",)
        return () => {
            gpsStream.stop()
        }
    }, []);
    return <Row gutter={[16, 16]}>
        <Col span={8}><Statistic precision={9} title="Position X"
                                 value={gps.Pose?.Pose?.Position?.X}/></Col>
        <Col span={8}><Statistic precision={9} title="Position Y"
                                 value={gps.Pose?.Pose?.Position?.Y}/></Col>
        <Col span={8}><Statistic precision={2} title="Altitude" value={gps.Pose?.Pose?.Position?.Z}/></Col>
        <Col span={8}><Statistic precision={2} title="Orientation"
                                 value={gps.Pose?.Pose?.Orientation?.Z}/></Col>
        <Col span={8}><Statistic precision={3} title="Accuracy" value={gps.PositionAccuracy}/></Col>
    </Row>;
}