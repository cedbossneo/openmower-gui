import {Card, Col, Row, Typography} from "antd";
import {MowerActions} from "../components/MowerActions.tsx";
import {StatusComponent} from "../components/StatusComponent.tsx";
import {HighLevelStatusComponent} from "../components/HighLevelStatusComponent.tsx";
import {ImuComponent} from "../components/ImuComponent.tsx";
import {WheelTicksComponent} from "../components/WheelTicksComponent.tsx";
import {GpsComponent} from "../components/GpsComponent.tsx";

export const OpenMowerPage = () => {
    return <Row gutter={[16, 16]}>
        <Col span={24}>
            <Typography.Title level={2}>OpenMower</Typography.Title>
        </Col>
        <Col span={24}>
            <MowerActions/>
        </Col>
        <Col span={24}>
            <Card title={"High Level Status"}>
                {<HighLevelStatusComponent/>}
            </Card>
        </Col>
        <Col span={24}>
            {<StatusComponent/>}
        </Col>
        <Col span={24}>
            <Card title={"IMU"}>
                {<ImuComponent/>}
            </Card>
        </Col>
        <Col lg={12} xs={24}>
            <Card title={"GPS"}>
                {<GpsComponent/>}
            </Card>
        </Col>
        <Col lg={12} xs={24}>
            <Card title={"Wheel Ticks"}>
                {<WheelTicksComponent/>}
            </Card>
        </Col>
    </Row>
}

export default OpenMowerPage;