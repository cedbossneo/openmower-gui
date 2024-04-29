import {Col, Row, Statistic} from "antd";
import {useGPS} from "../hooks/useGPS.ts";
import { booleanFormatter, booleanFormatterInverted } from "./utils.tsx";
import { AbsolutePoseFlags as Flags } from "../types/ros.ts";

export function GpsComponent() {
    const gps = useGPS();

    const flags = gps.Flags ?? 0;
    let fixType = "\u2013";
    if ((flags & Flags.FIXED) != 0) {
        fixType = "FIX";
    } else if ((flags & Flags.FLOAT) != 0) {
        fixType = "FLOAT";
    }

    return <>
        <Row gutter={[16, 16]}>
            <Col lg={8} xs={24}><Statistic precision={9} title="Position X"
                                        value={gps.Pose?.Pose?.Position?.X}/></Col>
            <Col lg={8} xs={24}><Statistic precision={9} title="Position Y"
                                        value={gps.Pose?.Pose?.Position?.Y}/></Col>
            <Col lg={8} xs={24}><Statistic precision={2} title="Altitude" value={gps.Pose?.Pose?.Position?.Z}/></Col>
            <Col lg={8} xs={24}><Statistic precision={2} title="Orientation"
                                        value={gps.Pose?.Pose?.Orientation?.Z}/></Col>
            <Col lg={8} xs={24}><Statistic precision={3} title="Accuracy" value={gps.PositionAccuracy}/></Col>
            </Row>
        <Row gutter={[16, 16]}>
            <Col lg={8} xs={24}><Statistic title="RTK" value={(flags & Flags.RTK) != 0 ? "Yes" : "No"}
                                        formatter={booleanFormatter}/></Col>
            <Col lg={8} xs={24}><Statistic title="Fix type" value={fixType}
                                        valueStyle={{color: fixType == "FIX" ? "#01d30d" : "red"}}/></Col>
            <Col lg={8} xs={24}><Statistic title="Dead reckoning" value={(flags & Flags.DEAD_RECKONING) != 0 ? "Yes" : "No"}
                                        formatter={booleanFormatterInverted}/></Col>
        </Row>
    </>;
}
