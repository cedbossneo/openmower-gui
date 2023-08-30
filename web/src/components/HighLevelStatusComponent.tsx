import {NotificationInstance} from "antd/es/notification/interface";
import {Col, Row, Statistic} from "antd";
import {booleanFormatter, booleanFormatterInverted, progressFormatter, stateRenderer} from "./utils.tsx";
import {useHighLevelStatus} from "../hooks/useHighLevelStatus.tsx";

export function HighLevelStatusComponent(props: { api: NotificationInstance }) {
    const highLevelStatus = useHighLevelStatus(props.api)
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
                                       formatter={booleanFormatterInverted}/></Col>
    </Row>;
}