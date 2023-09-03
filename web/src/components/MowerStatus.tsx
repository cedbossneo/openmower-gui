import {useHighLevelStatus} from "../hooks/useHighLevelStatus.ts";
import {Col, Row, Statistic} from "antd";
import {PoweroffOutlined, WifiOutlined} from "@ant-design/icons"
import {progressFormatterSmall, stateRenderer} from "./utils.tsx";

export const MowerStatus = () => {
    const {highLevelStatus} = useHighLevelStatus();
    return <Row gutter={[16, 16]} style={{margin: 0}}>
        <Col><Statistic valueStyle={{color: "#3f8600", fontSize: "14px"}}
                        value={stateRenderer(highLevelStatus.StateName)}/></Col>
        <Col><Statistic
            prefix={<WifiOutlined style={{color: (highLevelStatus.GpsQualityPercent ?? 0) > 0 ? "green" : "red"}}/>}
            valueStyle={{fontSize: "14px"}} precision={0}
            value={(highLevelStatus.GpsQualityPercent ?? 0) * 100}
            suffix={"%"}/></Col>
        <Col><Statistic prefix={<PoweroffOutlined style={{color: highLevelStatus.IsCharging ? "green" : undefined}}/>}
                        valueStyle={{fontSize: "14px"}} precision={2}
                        value={(highLevelStatus.BatteryPercent ?? 0) * 100}
                        formatter={progressFormatterSmall}/></Col>
    </Row>;
}