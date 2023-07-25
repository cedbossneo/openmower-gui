import {Card, Col, notification, Progress, Row, Statistic, Typography} from "antd";
import {CheckCircleTwoTone, CloseCircleTwoTone} from "@ant-design/icons";
import {useEffect, useState} from "react";
import AsyncButton from "../components/AsyncButton.tsx";
import {useWS} from "../hooks/useWS.ts";
import {useApi} from "../hooks/useApi.ts";
import {ESCStatus, Gps, HighLevelStatus, Imu, Status, WheelTick} from "../types/ros.ts";
import {NotificationInstance} from "antd/es/notification/interface";

const booleanFormatter = (value: any) => (value === "On" || value === "Yes") ?
    <CheckCircleTwoTone twoToneColor={"#01d30d"}/> : <CloseCircleTwoTone twoToneColor={"red"}/>;

const stateRenderer = (value: string | undefined) => {
    switch (value) {
        case "IDLE":
            return "Idle"
        case "MOWING":
            return "Mowing"
        case "DOCKING":
            return "Docking"
        case "UNDOCKING":
            return "Undocking"
        case "AREA_RECORDING":
            return "Area Recording"
        default:
            return "Unknown"
    }
};
const progressFormatter = (value: any) => {
    return <Progress steps={3} percent={value} size={25} showInfo={false}/>
};

function GpsComponent(props: { api: NotificationInstance }) {
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

function WheelTicksComponent(props: { api: NotificationInstance }) {
    const [wheelTicks, setWheelTicks] = useState<WheelTick>({})
    const ticksStream = useWS<string>(() => {
            props.api.info({
                message: "Wheel Ticks Stream closed",
            })
        }, () => {
            props.api.info({
                message: "Wheel Ticks Stream connected",
            })
        },
        (e) => {
            setWheelTicks(JSON.parse(e))
        })
    useEffect(() => {
        ticksStream.start("/api/openmower/subscribe/ticks",)
        return () => {
            ticksStream.stop()
        }
    }, []);
    return <Row gutter={[16, 16]}>
        <Col span={8}><Statistic title="Rear Left" value={wheelTicks?.WheelTicksRl}/></Col>
        <Col span={8}><Statistic title="Rear Right" value={wheelTicks?.WheelTicksRr}/></Col>
        <Col span={8}><Statistic title="Rear Left Direction" value={wheelTicks?.WheelDirectionRl}/></Col>
        <Col span={8}><Statistic title="Rear Right Direction" value={wheelTicks?.WheelDirectionRr}/></Col>
    </Row>;
}

function ImuComponent(props: { api: NotificationInstance }) {
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
        <Col span={8}><Statistic precision={9} title="Angular Velocity X"
                                 value={imu.AngularVelocity?.X}/></Col>
        <Col span={8}><Statistic precision={9} title="Angular Velocity Y"
                                 value={imu.AngularVelocity?.Y}/></Col>
        <Col span={8}><Statistic precision={9} title="Angular Velocity Z"
                                 value={imu.AngularVelocity?.Z}/></Col>
        <Col span={8}><Statistic precision={9} title="Linear Acceleration X"
                                 value={imu.LinearAcceleration?.X}/></Col>
        <Col span={8}><Statistic precision={9} title="Linear Acceleration Y"
                                 value={imu.LinearAcceleration?.Y}/></Col>
        <Col span={8}><Statistic precision={9} title="Linear Acceleration Z"
                                 value={imu.LinearAcceleration?.Z}/></Col>
        <Col span={8}><Statistic precision={9} title="Orientation X" value={imu.Orientation?.X}/></Col>
        <Col span={8}><Statistic precision={9} title="Orientation Y" value={imu.Orientation?.Y}/></Col>
        <Col span={8}><Statistic precision={9} title="Orientation Z" value={imu.Orientation?.Z}/></Col>
    </Row>;
}

function HighLevelStatusComponent(props: { api: NotificationInstance }) {
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
        <Col span={6}><Statistic title="State" valueStyle={{color: '#3f8600'}}
                                 value={stateRenderer(highLevelStatus.StateName)}/></Col>
        <Col span={6}><Statistic title="GPS Quality" value={(highLevelStatus.GpsQualityPercent ?? 0) * 100}
                                 suffix={"%"}/></Col>
        <Col span={6}><Statistic title="Battery" value={(highLevelStatus.BatteryPercent ?? 0) * 100}
                                 formatter={progressFormatter}/></Col>
        <Col span={6}><Statistic title="Charging" value={highLevelStatus.IsCharging ? "Yes" : "No"}
                                 formatter={booleanFormatter}/></Col>
        <Col span={6}><Statistic title="Emergency" value={highLevelStatus.Emergency ? "Yes" : "No"}
                                 formatter={booleanFormatter}/></Col>
    </Row>;
}

function StatusComponent(props: { api: NotificationInstance }) {
    const [status, setStatus] = useState<Status>({})
    const statusStream = useWS<string>(() => {
            props.api.info({
                message: "Status Stream closed",
            })
        }, () => {
            props.api.info({
                message: "Status Stream connected",
            })
        },
        (e) => {
            setStatus(JSON.parse(e))
        })
    useEffect(() => {
        statusStream.start("/api/openmower/subscribe/status",)
        return () => {
            statusStream.stop()
        }
    }, []);
    const renderEscStatus = (escStatus: ESCStatus | undefined) => {
        return <Row gutter={[16, 16]}>
            <Col span={8}><Statistic title="Status" value={escStatus?.Status}/></Col>
            <Col span={8}><Statistic precision={2} title="Current" value={escStatus?.Current}/></Col>
            <Col span={8}><Statistic precision={2} title="Tacho" value={escStatus?.Tacho}/></Col>
            <Col span={8}><Statistic precision={2} title="Motor Temperature" value={escStatus?.TemperatureMotor}
                                     suffix={"°C"}/></Col>
            <Col span={8}><Statistic precision={2} title="PCB Temperature" value={escStatus?.TemperaturePcb}
                                     suffix={"°C"}/></Col>
        </Row>
    };
    return <Row gutter={[16, 16]}>
        <Col span={24}>
            <Card title={"Status"}>
                <Row gutter={[16, 16]}>
                    <Col span={6}><Statistic title="Mower status"
                                             value={status.MowerStatus == 255 ? "On" : "Off"}
                                             formatter={booleanFormatter}/></Col>
                    <Col span={6}><Statistic title="Raspberry Pi power" value={status.RaspberryPiPower ? "On" : "Off"}
                                             formatter={booleanFormatter}/></Col>
                    <Col span={6}><Statistic title="GPS power" value={status.GpsPower ? "On" : "Off"}
                                             formatter={booleanFormatter}/></Col>
                    <Col span={6}><Statistic title="ESC power" value={status.EscPower ? "On" : "Off"}
                                             formatter={booleanFormatter}/></Col>
                    <Col span={6}><Statistic title="Rain detected" value={status.RainDetected ? "Yes" : "No"}
                                             formatter={booleanFormatter}/></Col>
                    <Col span={6}><Statistic title="Sound module available"
                                             value={status.SoundModuleAvailable ? "Yes" : "No"}
                                             formatter={booleanFormatter}/></Col>
                    <Col span={6}><Statistic title="Sound module busy"
                                             value={status.SoundModuleBusy ? "Yes" : "No"}
                                             formatter={booleanFormatter}/></Col>
                    <Col span={6}><Statistic title="UI board available" value={status.UiBoardAvailable ? "Yes" : "No"}
                                             formatter={booleanFormatter}/></Col>
                    <Col span={6}><Statistic title="Ultrasonic ranges"
                                             value={status.UltrasonicRanges?.join(", ")}/></Col>
                    <Col span={6}><Statistic title="Emergency" value={status.Emergency ? "Yes" : "No"}
                                             formatter={booleanFormatter}/></Col>
                    <Col span={6}><Statistic title="Voltage charge" value={status.VCharge} suffix={"V"}/></Col>
                    <Col span={6}><Statistic title="Voltage battery" value={status.VBattery} suffix={"V"}/></Col>
                    <Col span={6}><Statistic title="Charge current" value={status.ChargeCurrent} suffix={"A"}/></Col>
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
    </Row>;
}

export const OpenMowerPage = () => {
    const guiApi = useApi()
    const [api, contextHolder] = notification.useNotification();

    const handleMowerCommand = (command: string, args: Record<string, any> = {}) => async () => {
        try {
            const res = await guiApi.openmower.callCreate(command, args)
            if (res.error) {
                throw new Error(res.error.error)
            }
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

    return <Row gutter={[16, 16]}>
        <Col span={24}>
            <Typography.Title level={2}>OpenMower</Typography.Title>
        </Col>
        <Col span={24}>
            <Card title={"Actions"}>
                {contextHolder}
                <AsyncButton size={"small"} type="primary" onAsyncClick={handleMowerCommand("mower_start")}
                             style={{marginRight: 10}}>Start</AsyncButton>
                <AsyncButton size={"small"} onAsyncClick={handleMowerCommand("mower_home")}
                             style={{marginRight: 10}}>Home</AsyncButton>
                <AsyncButton size={"small"} onAsyncClick={handleMowerCommand("mower_s1")}
                             style={{marginRight: 10}}>S1</AsyncButton>
                <AsyncButton size={"small"} onAsyncClick={handleMowerCommand("mower_s2")}
                             style={{marginRight: 10}}>S2</AsyncButton>
                <AsyncButton size={"small"} onAsyncClick={handleMowerCommand("emergency", {emergency: 1})}
                             style={{marginRight: 10}}>Emergency On</AsyncButton>
                <AsyncButton size={"small"} onAsyncClick={handleMowerCommand("mow", {mow_enabled: 1, mow_direction: 0})}
                             style={{marginRight: 10}}>Blade On</AsyncButton>
                <AsyncButton size={"small"} danger onAsyncClick={handleMowerCommand("emergency", {emergency: 0})}
                             style={{marginRight: 10}}>Emergency Off</AsyncButton>
                <AsyncButton size={"small"} danger
                             onAsyncClick={handleMowerCommand("mow", {mow_enabled: 0, mow_direction: 0})}
                             style={{marginRight: 10}}>Blade Off</AsyncButton>
            </Card>
        </Col>
        <Col span={24}>
            <Card title={"High Level Status"}>
                {<HighLevelStatusComponent api={api}/>}
            </Card>
        </Col>
        <Col span={24}>
            {<StatusComponent api={api}/>}
        </Col>
        <Col span={24}>
            <Card title={"IMU"}>
                {<ImuComponent api={api}/>}
            </Card>
        </Col>
        <Col span={12}>
            <Card title={"GPS"}>
                {<GpsComponent api={api}/>}
            </Card>
        </Col>
        <Col span={12}>
            <Card title={"Wheel Ticks"}>
                {<WheelTicksComponent api={api}/>}
            </Card>
        </Col>
    </Row>
}

export default OpenMowerPage;