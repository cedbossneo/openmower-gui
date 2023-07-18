import {Card, Col, notification, Row, Statistic, Typography} from "antd";
import {useEffect, useState} from "react";
import AsyncSwitch from "../components/AsyncSwitch.tsx";
import AsyncButton from "../components/AsyncButton.tsx";
import {useSSE} from "../hooks/useSSE.ts";
import {useApi} from "../hooks/useApi.ts";

type WheelTick = {
    /*
    WheelTickFactor  uint32
	ValidWheels      uint8
	WheelDirectionFl uint8
	WheelTicksFl     uint32
	WheelDirectionFr uint8
	WheelTicksFr     uint32
	WheelDirectionRl uint8
	WheelTicksRl     uint32
	WheelDirectionRr uint8
	WheelTicksRr     uint32
     */
    WheelTickFactor?: number
    ValidWheels?: number
    WheelDirectionFl?: number
    WheelTicksFl?: number
    WheelDirectionFr?: number
    WheelTicksFr?: number
    WheelDirectionRl?: number
    WheelTicksRl?: number
    WheelDirectionRr?: number
    WheelTicksRr?: number
}

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

type Point = {
    /*
    X           float64
	Y           float64
	Z           float64
     */
    X?: number
    Y?: number
    Z?: number
}

type Quaternion = {
    /*
    X           float64
	Y           float64
	Z           float64
	W           float64
     */
    X?: number
    Y?: number
    Z?: number
    W?: number
}

type Pose = {
    /*
    Position    Point
	Orientation Quaternion
     */
    Position?: Point
    Orientation?: Quaternion
}

type PoseWithCovariance = {
    /*
    Pose        Pose
	Covariance  [36]float64
     */
    Pose?: Pose
    Covariance?: number[]
}

type Vector3 = {
    /*
    X           float64
	Y           float64
	Z           float64
     */
    X?: number
    Y?: number
    Z?: number
}

type Gps = {
    /*
        SensorStamp uint32
        ReceivedStamp uint32
        Source uint8
        Flags uint16
        OrientationValid uint8
        MotionVectorValid uint8
        PositionAccuracy float32
        OrientationAccuracy float32
        Pose geometry_msgs.PoseWithCovariance
        MotionVector geometry_msgs.Vector3
        VehicleHeading float64
        MotionHeading float64
     */
    SensorStamp?: number
    ReceivedStamp?: number
    Source?: number
    Flags?: number
    OrientationValid?: number
    MotionVectorValid?: number
    PositionAccuracy?: number
    OrientationAccuracy?: number
    Pose?: PoseWithCovariance
    MotionVector?: Vector3
    VehicleHeading?: number
    MotionHeading?: number
}

type Imu = {
    /*
    	Dt          uint16
	Ax          float64
	Ay          float64
	Az          float64
	Gx          float64
	Gy          float64
	Gz          float64
	Mx          float64
	My          float64
	Mz          float64
     */
    Dt?: number
    Ax?: number
    Ay?: number
    Az?: number
    Gx?: number
    Gy?: number
    Gz?: number
    Mx?: number
    My?: number
    Mz?: number
}

export const OpenMowerPage = () => {
    const guiApi = useApi()
    const [gps, setGps] = useState<Gps>({})
    const [wheelTicks, setWheelTicks] = useState<WheelTick>({})
    const [imu, setImu] = useState<Imu>({})
    const [status, setStatus] = useState<Status>({})
    const [api, contextHolder] = notification.useNotification();
    const statusStream = useSSE<string>("/api/openmower/subscribe/status", () => {
            api.info({
                message: "Status Stream closed",
            })
        }, () => {
            api.info({
                message: "Status Stream connected",
            })
        },
        (e) => {
            setStatus(JSON.parse(e))
        })
    const imuStream = useSSE<string>("/api/openmower/subscribe/imu", () => {
            api.info({
                message: "IMU Stream closed",
            })
        }, () => {
            api.info({
                message: "IMU Stream connected",
            })
        },
        (e) => {
            setImu(JSON.parse(e))
        })
    const gpsStream = useSSE<string>("/api/openmower/subscribe/gps", () => {
            api.info({
                message: "GPS Stream closed",
            })
        }, () => {
            api.info({
                message: "GPS Stream connected",
            })
        },
        (e) => {
            setGps(JSON.parse(e))
        })
    const ticksStream = useSSE<string>("/api/openmower/subscribe/ticks", () => {
            api.info({
                message: "Wheel Ticks Stream closed",
            })
        }, () => {
            api.info({
                message: "Wheel Ticks Stream connected",
            })
        },
        (e) => {
            setWheelTicks(JSON.parse(e))
        })

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
    const renderEscStatus = (escStatus: ESCStatus | undefined) => {
        return <Row gutter={[16, 16]}>
            <Col span={8}><Statistic title="Status" value={escStatus?.Status}/></Col>
            <Col span={8}><Statistic title="Current" value={escStatus?.Current}/></Col>
            <Col span={8}><Statistic title="Tacho" value={escStatus?.Tacho}/></Col>
            <Col span={8}><Statistic title="Motor Temperature" value={escStatus?.TemperatureMotor}/></Col>
            <Col span={8}><Statistic title="PCB Temperature" value={escStatus?.TemperaturePcb}/></Col>
        </Row>
    };

    useEffect(() => {
        statusStream.start()
        imuStream.start()
        gpsStream.start()
        ticksStream.start()
        return () => {
            statusStream.stop()
            imuStream.stop()
            gpsStream.stop()
            ticksStream.stop()
        }
    }, []);

    return <Row gutter={[16, 16]}>
        <Col span={24}>
            <Typography.Title level={2}>OpenMower</Typography.Title>
        </Col>
        <Col span={24}>
            <Card title={"Actions"}>
                {contextHolder}
                <AsyncButton size={"small"} type="primary" onAsyncClick={handleMowerCommand("mower_start")}
                             style={{marginRight: 10}}>Start</AsyncButton>
                <AsyncButton size={"small"} type="primary" onAsyncClick={handleMowerCommand("mower_home")}
                             style={{marginRight: 10}}>Home</AsyncButton>
                <AsyncButton size={"small"} type="primary" onAsyncClick={handleMowerCommand("mower_s1")}
                             style={{marginRight: 10}}>S1</AsyncButton>
                <AsyncButton size={"small"} type="primary" onAsyncClick={handleMowerCommand("mower_s2")}
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
        <Col span={24}>
            <Card title={"IMU"}>
                <Row gutter={[16, 16]}>
                    <Col span={8}><Statistic title="Acceleration X" value={imu?.Ax}/></Col>
                    <Col span={8}><Statistic title="Acceleration Y" value={imu?.Ay}/></Col>
                    <Col span={8}><Statistic title="Acceleration Z" value={imu?.Az}/></Col>
                    <Col span={8}><Statistic title="Gyro X" value={imu?.Gx}/></Col>
                    <Col span={8}><Statistic title="Gyro Y" value={imu?.Gy}/></Col>
                    <Col span={8}><Statistic title="Gyro Z" value={imu?.Gz}/></Col>
                    <Col span={8}><Statistic title="Magnetometer X" value={imu?.Mx}/></Col>
                    <Col span={8}><Statistic title="Magnetometer Y" value={imu?.My}/></Col>
                    <Col span={8}><Statistic title="Magnetometer Z" value={imu?.Mz}/></Col>
                </Row>
            </Card>
        </Col>
        <Col span={12}>
            <Card title={"GPS"}>
                <Row gutter={[16, 16]}>
                    <Col span={8}><Statistic title="Latitude" value={gps.Pose?.Pose?.Position?.X}/></Col>
                    <Col span={8}><Statistic title="Longitude" value={gps.Pose?.Pose?.Position?.Y}/></Col>
                    <Col span={8}><Statistic title="Altitude" value={gps.Pose?.Pose?.Position?.Z}/></Col>
                    <Col span={8}><Statistic title="Roll" value={gps.Pose?.Pose?.Orientation?.X}/></Col>
                    <Col span={8}><Statistic title="Pitch" value={gps.Pose?.Pose?.Orientation?.Y}/></Col>
                    <Col span={8}><Statistic title="Yaw" value={gps.Pose?.Pose?.Orientation?.Z}/></Col>
                    <Col span={8}><Statistic title="Accuracy" value={gps.PositionAccuracy}/></Col>
                </Row>
            </Card>
        </Col>
        <Col span={12}>
            <Card title={"Wheel Ticks"}>
                <Row gutter={[16, 16]}>
                    <Col span={8}><Statistic title="Rear Left" value={wheelTicks?.WheelTicksRl}/></Col>
                    <Col span={8}><Statistic title="Rear Right" value={wheelTicks?.WheelTicksRr}/></Col>
                    <Col span={8}><Statistic title="Rear Left Direction" value={wheelTicks?.WheelDirectionRl}/></Col>
                    <Col span={8}><Statistic title="Rear Right Direction" value={wheelTicks?.WheelDirectionRr}/></Col>
                </Row>
            </Card>
        </Col>
    </Row>
}

export default OpenMowerPage;