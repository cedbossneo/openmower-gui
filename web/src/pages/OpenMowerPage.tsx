import {Card, Col, notification, Row, Statistic, Typography} from "antd";
import {useEffect, useState} from "react";
import AsyncSwitch from "../components/AsyncSwitch.tsx";
import AsyncButton from "../components/AsyncButton.tsx";

let stream: null | EventSource = null

/*
	MowerStatus          uint8
	RaspberryPiPower     bool
	GpsPower             bool
	EscPower             bool
	RainDetected         bool
	SoundModuleAvailable bool
	SoundModuleBusy      bool
	UiBoardAvailable     bool
	UltrasonicRanges     [5]float32
	Emergency            bool
	VCharge              float32
	VBattery             float32
	ChargeCurrent        float32
	LeftEscStatus        ESCStatus
	RightEscStatus       ESCStatus
	MowEscStatus         ESCStatus
 */

type Status = {
    MowerStatus?: number
    RaspberryPiPower?: boolean
    GpsPower?: boolean
    EscPower?: boolean
    RainDetected?: boolean
    SoundModuleAvailable?: boolean
    SoundModuleBusy?: boolean
    UiBoardAvailable?: boolean
    UltrasonicRanges?: [number, number, number, number, number]
    Emergency?: boolean
    VCharge?: number
    VBattery?: number
    ChargeCurrent?: number
    LeftEscStatus?: ESCStatus
    RightEscStatus?: ESCStatus
    MowEscStatus?: ESCStatus
}

type ESCStatus = {
    Status?: string
    Current?: number
    Tacho?: number
    TemperatureMotor?: number
    TemperaturePcb?: number
}

export const OpenMowerPage = () => {
    const [status, setStatus] = useState<Status>({})
    const [api, contextHolder] = notification.useNotification();
    const streamOpenMowerStatus = () => {
        stream?.close();
        stream = null
        stream = new EventSource(`/api/openmower/subscribe/status`);
        stream.onopen = function () {
            api.info({
                message: "Logs stream connected",
            })
        }
        stream.onerror = function () {
            api.info({
                message: "Logs stream closed",
            })
            stream?.close();
            stream = null
        };
        stream.onmessage = function (e) {
            let parse = JSON.parse(atob(e.data));
            console.log(parse)
            setStatus(parse)
        };
    };

    useEffect(() => {
        streamOpenMowerStatus()
    }, [])

    const handleMowerCommand = (command: string, args: Record<string, any> = {}) => async () => {
        try {
            await fetch(`/api/openmower/call/${command}`, {
                method: "POST",
                body: JSON.stringify(args),
            }).then((e) => e.json()).then((e) => {
                if (e.error) {
                    throw new Error(e.error)
                }
            })
            api.success({
                message: "Command sent",
            })
        } catch (e: any) {
            api.error({
                message: "Unable to send command",
                description: e.message,
            })
        }
    };
    const renderEscStatus = (escStatus: ESCStatus | undefined) => {
        return <Row gutter={[16, 16]}>
            <Col span={8}><Statistic title="Status" value={escStatus?.Status}/></Col>
            <Col span={8}><Statistic title="Current" value={escStatus?.Current}/></Col>
            <Col span={8}><Statistic title="Tacho" value={escStatus?.Tacho}/></Col>
            <Col span={8}><Statistic title="Motor Temperature" value={escStatus?.TemperatureMotor}/></Col>
            <Col span={8}><Statistic title="PCB Temperature" value={escStatus?.TemperaturePcb}/></Col>
        </Row>
    };
    return <Row gutter={[16, 16]}>
        <Col span={24}>
            <Typography.Title level={2}>OpenMower</Typography.Title>
        </Col>
        <Col span={24}>
            <Card title={"Actions"}>
                {contextHolder}
                <AsyncButton type="primary" onAsyncClick={handleMowerCommand("mower_start")}
                             style={{marginRight: 10}}>Start</AsyncButton>
                <AsyncButton type="primary" onAsyncClick={handleMowerCommand("mower_home")}
                             style={{marginRight: 10}}>Home</AsyncButton>
                <AsyncButton type="primary" onAsyncClick={handleMowerCommand("mower_s1")}
                             style={{marginRight: 10}}>S1</AsyncButton>
                <AsyncButton type="primary" onAsyncClick={handleMowerCommand("mower_s2")}
                             style={{marginRight: 10}}>S2</AsyncButton>
                <AsyncSwitch style={{marginRight: 10}} checked={!!status.Emergency} onAsyncChange={(checked) => {
                    return handleMowerCommand("emergency", {emergency: checked ? 1 : 0})()
                }} checkedChildren={"Emergency active"} unCheckedChildren={"Emergency inactive"}/>
                <AsyncSwitch style={{marginRight: 10}} checked={!!status.MowEscStatus?.Tacho}
                             onAsyncChange={(checked) => {
                                 return handleMowerCommand("mow", {mow_enabled: checked ? 1 : 0, mow_direction: 0})()
                             }} checkedChildren={"Mowing enabled"} unCheckedChildren={"Mowing disabled"}/>
            </Card>
        </Col>
        <Col span={24}>
            <Card title={"Status"}>
                <Row gutter={[16, 16]}>
                    <Col span={6}><Statistic title="Mower status" value={status.MowerStatus}/></Col>
                    <Col span={6}><Statistic title="Raspberry Pi power" value={status.RaspberryPiPower ? "On" : "Off"}/></Col>
                    <Col span={6}><Statistic title="GPS power" value={status.GpsPower ? "On" : "Off"}/></Col>
                    <Col span={6}><Statistic title="ESC power" value={status.EscPower ? "On" : "Off"}/></Col>
                    <Col span={6}><Statistic title="Rain detected" value={status.RainDetected ? "Yes" : "No"}/></Col>
                    <Col span={6}><Statistic title="Sound module available"
                                             value={status.SoundModuleAvailable ? "Yes" : "No"}/></Col>
                    <Col span={6}><Statistic title="Sound module busy"
                                             value={status.SoundModuleBusy ? "Yes" : "No"}/></Col>
                    <Col span={6}><Statistic title="UI board available" value={status.UiBoardAvailable ? "Yes" : "No"}/></Col>
                    <Col span={6}><Statistic title="Ultrasonic ranges"
                                             value={status.UltrasonicRanges?.join(", ")}/></Col>
                    <Col span={6}><Statistic title="Emergency" value={status.Emergency ? "Yes" : "No"}/></Col>
                    <Col span={6}><Statistic title="Voltage charge" value={status.VCharge}/></Col>
                    <Col span={6}><Statistic title="Voltage battery" value={status.VBattery}/></Col>
                    <Col span={6}><Statistic title="Charge current" value={status.ChargeCurrent}/></Col>
                </Row>
            </Card>
        </Col>
        <Col span={8}>
            <Card title={"Left ESC Status"}>
                {renderEscStatus(status.LeftEscStatus)}
            </Card>
        </Col>
        <Col span={8}>
            <Card title={"Right ESC status"}>
                {renderEscStatus(status.RightEscStatus)}
            </Card>
        </Col>
        <Col span={8}>
            <Card title={"Mow ESC status"}>
                {renderEscStatus(status.MowEscStatus)}
            </Card>
        </Col>
    </Row>
}

export default OpenMowerPage;