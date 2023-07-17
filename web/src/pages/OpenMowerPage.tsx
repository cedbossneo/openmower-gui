import {Button, Col, notification, Row, Typography} from "antd";
import {useEffect, useState} from "react";

let stream: null | EventSource = null

export const OpenMowerPage = () => {
    const [status, setStatus] = useState<Record<string, any>>({})
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
    const renderEscStatus = (escStatus: any) => {
        return <div>
            <Typography.Text>Status: {escStatus?.Status}</Typography.Text><br/>
            <Typography.Text>Current: {escStatus?.Current}</Typography.Text><br/>
            <Typography.Text>Tacho: {escStatus?.Tacho}</Typography.Text><br/>
            <Typography.Text>TemperatureMotor: {escStatus?.TemperatureMotor}</Typography.Text><br/>
            <Typography.Text>TemperaturePcb: {escStatus?.TemperaturePcb}</Typography.Text><br/>
        </div>
    };
    return <Row>
        <Col span={24}>
            <Typography.Title level={2}>OpenMower</Typography.Title>
        </Col>
        <Col span={24}>
            {contextHolder}
            <Button type="primary" onClick={handleMowerCommand("mower_start")} style={{marginRight: 10}}>Start</Button>
            <Button type="primary" onClick={handleMowerCommand("mower_home")} style={{marginRight: 10}}>Home</Button>
            <Button type="primary" onClick={handleMowerCommand("mower_s1")} style={{marginRight: 10}}>S1</Button>
            <Button type="primary" onClick={handleMowerCommand("mower_s2")} style={{marginRight: 10}}>S2</Button>
            <Button type="primary" onClick={handleMowerCommand("emergency", {emergency: 0})} style={{marginRight: 10}}>Reset
                Emergency</Button>
            <Button type="primary" onClick={handleMowerCommand("mow", {mow_enabled: 1, mow_direction: 0})}>Mow
                motor</Button>
        </Col>
        <Col span={24}>
            <Typography.Title level={2}>Status</Typography.Title>
        </Col>
        <Col span={24}>
            <Typography.Text>Mower status: {status.MowerStatus}</Typography.Text>
        </Col>
        <Col span={24}>
            <Typography.Text>Raspberry Pi power: {status.RaspberryPiPower ? "On" : "Off"}</Typography.Text>
        </Col>
        <Col span={24}>
            <Typography.Text>GPS power: {status.GpsPower ? "On" : "Off"}</Typography.Text>
        </Col>
        <Col span={24}>
            <Typography.Text>ESC power: {status.EscPower ? "On" : "Off"}</Typography.Text>
        </Col>
        <Col span={24}>
            <Typography.Text>Rain detected: {status.RainDetected ? "Yes" : "No"}</Typography.Text>
        </Col>
        <Col span={24}>
            <Typography.Text>Sound module available: {status.SoundModuleAvailable ? "Yes" : "No"}</Typography.Text>
        </Col>
        <Col span={24}>
            <Typography.Text>Sound module busy: {status.SoundModuleBusy ? "Yes" : "No"}</Typography.Text>
        </Col>
        <Col span={24}>
            <Typography.Text>UI board available: {status.UiBoardAvailable ? "Yes" : "No"}</Typography.Text>
        </Col>
        <Col span={24}>
            <Typography.Text>Ultrasonic ranges: {status.UltrasonicRanges?.join(", ")}</Typography.Text>
        </Col>
        <Col span={24}>
            <Typography.Text>Emergency: {status.Emergency ? "Yes" : "No"}</Typography.Text>
        </Col>
        <Col span={24}>
            <Typography.Text>Voltage charge: {status.VCharge}</Typography.Text>
        </Col>
        <Col span={24}>
            <Typography.Text>Voltage battery: {status.VBattery}</Typography.Text>
        </Col>
        <Col span={24}>
            <Typography.Text>Charge current: {status.ChargeCurrent}</Typography.Text>
        </Col>
        <Col span={24}>
            <Typography.Title level={4}>Left ESC Status</Typography.Title>
            {renderEscStatus(status.LeftEscStatus)}
        </Col>
        <Col span={24}>
            <Typography.Title level={4}>Right ESC status:</Typography.Title>
            {renderEscStatus(status.RightEscStatus)}
        </Col>
        <Col span={24}>
            <Typography.Title level={4}>Mow ESC status:</Typography.Title>
            {renderEscStatus(status.MowEscStatus)}
        </Col>
    </Row>
}

export default OpenMowerPage;