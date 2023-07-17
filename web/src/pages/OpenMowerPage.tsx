import {Button, Col, notification, Row, Typography} from "antd";

export const OpenMowerPage = () => {
    const [api, contextHolder] = notification.useNotification();
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
    </Row>
}

export default OpenMowerPage;