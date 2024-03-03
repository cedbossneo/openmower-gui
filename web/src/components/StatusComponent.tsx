import {ESCStatus} from "../types/ros.ts";
import {Card, Col, Row, Statistic} from "antd";
import {booleanFormatter} from "./utils.tsx";
import {useStatus} from "../hooks/useStatus.ts";

export function StatusComponent() {
    const status = useStatus();
    const renderEscStatus = (escStatus: ESCStatus | undefined) => {
        return <Row gutter={[16, 16]}>
            <Col lg={8} xs={12}><Statistic title="Status" value={escStatus?.Status}/></Col>
            <Col lg={8} xs={12}><Statistic precision={2} title="Current" value={escStatus?.Current}/></Col>
            <Col lg={8} xs={12}><Statistic precision={0} title="Tacho" value={escStatus?.Tacho}/></Col>
            <Col lg={8} xs={12}><Statistic precision={2} title="Motor Temperature" value={escStatus?.TemperatureMotor}
                                           suffix={"°C"}/></Col>
            <Col lg={8} xs={12}><Statistic precision={2} title="PCB Temperature" value={escStatus?.TemperaturePcb}
                                           suffix={"°C"}/></Col>
        </Row>
    };
    return <Row gutter={[16, 16]}>
        <Col lg={24}>
            <Card title={"Status"}>
                <Row gutter={[16, 16]}>
                    <Col lg={6} xs={12}><Statistic title="Mower status"
                                                   value={status.MowerStatus == 255 ? "On" : "Off"}
                                                   formatter={booleanFormatter}/></Col>
                    <Col lg={6} xs={12}><Statistic title="Raspberry Pi power"
                                                   value={status.RaspberryPiPower ? "On" : "Off"}
                                                   formatter={booleanFormatter}/></Col>
                    <Col lg={6} xs={12}><Statistic title="GPS power" value={status.GpsPower ? "On" : "Off"}
                                                   formatter={booleanFormatter}/></Col>
                    <Col lg={6} xs={12}><Statistic title="ESC power" value={status.EscPower ? "On" : "Off"}
                                                   formatter={booleanFormatter}/></Col>
                    <Col lg={6} xs={12}><Statistic title="Rain detected" value={status.RainDetected ? "Yes" : "No"}
                                                   formatter={booleanFormatter}/></Col>
                    <Col lg={6} xs={12}><Statistic title="Sound module available"
                                                   value={status.SoundModuleAvailable ? "Yes" : "No"}
                                                   formatter={booleanFormatter}/></Col>
                    <Col lg={6} xs={12}><Statistic title="Sound module busy"
                                                   value={status.SoundModuleBusy ? "Yes" : "No"}
                                                   formatter={booleanFormatter}/></Col>
                    <Col lg={6} xs={12}><Statistic title="UI board available"
                                                   value={status.UiBoardAvailable ? "Yes" : "No"}
                                                   formatter={booleanFormatter}/></Col>
                    <Col lg={6} xs={12}><Statistic title="Emergency" value={status.Emergency ? "Yes" : "No"}
                                                   formatter={booleanFormatter}/></Col>
                    <Col lg={6} xs={24}><Statistic title="Ultrasonic ranges"
                                                   value={status.UltrasonicRanges?.join(", ")}/></Col>
                    <Col lg={6} xs={24}><Statistic title="Voltage charge" value={status.VCharge} suffix={"V"}/></Col>
                    <Col lg={6} xs={24}><Statistic title="Voltage battery" value={status.VBattery} suffix={"V"}/></Col>
                    <Col lg={6} xs={24}><Statistic title="Charge current" value={status.ChargeCurrent}
                                                   suffix={"A"}/></Col>
                </Row>
            </Card>
        </Col>
        <Col lg={8} xs={24}>
            <Card title={"Left ESC Status"}>
                {renderEscStatus(status.LeftEscStatus)}
            </Card>
        </Col>
        <Col lg={8} xs={24}>
            <Card title={"Right ESC status"}>
                {renderEscStatus(status.RightEscStatus)}
            </Card>
        </Col>
        <Col lg={8} xs={24}>
            <Card title={"Mow ESC status"}>
                {renderEscStatus(status.MowEscStatus)}
            </Card>
        </Col>
    </Row>;
}