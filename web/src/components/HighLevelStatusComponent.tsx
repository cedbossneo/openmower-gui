import {Col, Row, Statistic} from "antd";
import {booleanFormatter, booleanFormatterInverted, progressFormatter, stateRenderer} from "./utils.tsx";
import {useHighLevelStatus} from "../hooks/useHighLevelStatus.ts";
import {useStatus} from "../hooks/useStatus.ts";
import {useSettings} from "../hooks/useSettings.ts";

export function HighLevelStatusComponent() {
    const {highLevelStatus} = useHighLevelStatus()
    const status = useStatus()
    const {settings} = useSettings()
    const estimateRemainingChargingTime = () => {
        if (!status.VBattery || !status.ChargeCurrent || status.ChargeCurrent == 0) {
            return "∞"
        }
        let capacity = (settings["OM_BATTERY_CAPACITY_MAH"] ?? "3000.0");
        let full = (settings["OM_BATTERY_FULL_VOLTAGE"] ?? "28.0");
        let empty = (settings["OM_BATTERY_EMPTY_VOLTAGE"] ?? "23.0");
        if (!capacity || !full || !empty) {
            return "∞"
        }
        const estimatedAmpsPerVolt = parseFloat(capacity) / (parseFloat(full) - parseFloat(empty))
        let estimatedRemainingAmps = (parseFloat(full) - (status.VBattery ?? 0)) * estimatedAmpsPerVolt;
        if (estimatedRemainingAmps < 10) {
            return "∞"
        }
        let remaining = estimatedRemainingAmps / ((status.ChargeCurrent ?? 0) * 1000)
        if (remaining < 0) {
            return "∞"
        }
        return remaining.toFixed(1) + "h"
    };
    return <Row gutter={[16, 16]}>
        <Col lg={6} xs={12}><Statistic title="State" valueStyle={{color: '#3f8600'}}
                                       value={stateRenderer(highLevelStatus.StateName)}/></Col>
        <Col lg={6} xs={12}><Statistic title="GPS Quality" precision={2}
                                       value={(highLevelStatus.GpsQualityPercent ?? 0) * 100}
                                       suffix={"%"}/></Col>
        <Col lg={6} xs={12}><Statistic title="Battery" value={(highLevelStatus.BatteryPercent ?? 0) * 100}
                                       formatter={progressFormatter}/></Col>
        <Col lg={6} xs={12}><Statistic title="Charging time left"
                                       value={highLevelStatus.IsCharging ? estimateRemainingChargingTime() : "-"}/></Col>
        <Col lg={6} xs={12}><Statistic title="Charging" value={highLevelStatus.IsCharging ? "Yes" : "No"}
                                       formatter={booleanFormatter}/></Col>
        <Col lg={6} xs={12}><Statistic title="Emergency" value={highLevelStatus.Emergency ? "Yes" : "No"}
                                       formatter={booleanFormatterInverted}/></Col>
    </Row>;
}