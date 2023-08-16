import {Col, Row, Typography} from "antd";
import {SettingsComponent} from "../components/SettingsComponent.tsx";
import {Submit} from "@formily/antd-v5";
import AsyncButton from "../components/AsyncButton.tsx";

export const SettingsPage = () => {
    return (<Row>
            <Col span={24}>
                <Typography.Title level={2}>Settings</Typography.Title>
            </Col>
            <Col span={24}>
                <SettingsComponent actions={(form, save, restart) => {
                    return [
                        <Submit loading={form.loading} onSubmit={save}>Save settings</Submit>,
                        <AsyncButton onAsyncClick={restart}>Restart OpenMower</AsyncButton>
                    ]
                }}/>
            </Col>
        </Row>
    )
}

export default SettingsPage;