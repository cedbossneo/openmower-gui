import {Card, Col, notification, Row, Typography} from "antd";
import {MowerActions} from "../components/MowerActions.tsx";
import {StatusComponent} from "../components/StatusComponent.tsx";
import {HighLevelStatusComponent} from "../components/HighLevelStatusComponent.tsx";
import {ImuComponent} from "../components/ImuComponent.tsx";
import {WheelTicksComponent} from "../components/WheelTicksComponent.tsx";
import {GpsComponent} from "../components/GpsComponent.tsx";

export const OpenMowerPage = () => {
    const [notificationInstance, notificationContextHolder] = notification.useNotification();


    return <Row gutter={[16, 16]}>
        {notificationContextHolder}
        <Col span={24}>
            <Typography.Title level={2}>OpenMower</Typography.Title>
        </Col>
        <Col span={24}>
            <MowerActions api={notificationInstance}/>
        </Col>
        <Col span={24}>
            <Card title={"High Level Status"}>
                {<HighLevelStatusComponent api={notificationInstance}/>}
            </Card>
        </Col>
        <Col span={24}>
            {<StatusComponent api={notificationInstance}/>}
        </Col>
        <Col span={24}>
            <Card title={"IMU"}>
                {<ImuComponent api={notificationInstance}/>}
            </Card>
        </Col>
        <Col lg={12} xs={24}>
            <Card title={"GPS"}>
                {<GpsComponent api={notificationInstance}/>}
            </Card>
        </Col>
        <Col lg={12} xs={24}>
            <Card title={"Wheel Ticks"}>
                {<WheelTicksComponent api={notificationInstance}/>}
            </Card>
        </Col>
    </Row>
}

export default OpenMowerPage;