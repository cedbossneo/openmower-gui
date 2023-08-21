import {App, Col, List, Row, Typography} from "antd";
import {useEffect, useState} from "react";
import AsyncButton from "../components/AsyncButton.tsx";
import {useApi} from "../hooks/useApi.ts";
import {ApiContainer} from "../api/Api.ts";

export const UpdatesPage = () => {
    const guiApi = useApi();
    const {notification} = App.useApp();
    const [loading, setLoading] = useState(false);
    const [containers, setContainers] = useState<ApiContainer[]>([]);

    async function listContainers() {
        setLoading(true);
        try {
            const containers = await guiApi.containers.updatesList();
            if (containers.error) {
                throw new Error(containers.error.error)
            }
            let options = containers.data.containers
            setContainers(options ?? []);
            setLoading(false);
        } catch (e: any) {
            notification.error({
                message: "Failed to list containers",
                description: e.message
            })
            setLoading(false);
        }
    }

    useEffect(() => {
        (async () => {
            await listContainers();
        })();
    }, [])

    let updates = containers.filter(c => c.update);
    return <Row>
        <Col span={24}>
            <Typography.Title level={2}>Updates</Typography.Title>
        </Col>
        <Col span={24} style={{marginBottom: 20}}>
            {!loading && updates ? <List>
                    {updates.map((container) => {
                        return <List.Item key={container.id}>
                            <Typography.Text>{container.labels?.app}</Typography.Text>
                            <AsyncButton disabled={container.labels?.app == "gui"} onAsyncClick={async () => {
                                try {
                                    if (!container.id) {
                                        throw new Error("Container id not found")
                                    }
                                    const response = await guiApi.containers.upgradeCreate(container.id)
                                    if (response.error) {
                                        throw new Error(response.error.error)
                                    }
                                    notification.success({
                                        message: "Update started",
                                        description: "The update has been started"
                                    })
                                } catch (e: any) {
                                    notification.error({
                                        message: "Failed to start update",
                                        description: e.message
                                    })
                                }
                            }}>Update</AsyncButton></List.Item>
                    })}
                    {!loading && updates.length === 0 ? <Typography.Text>No updates available</Typography.Text> : null}
                </List> :
                <Typography.Text>Searching for updates, because we are pulling images for that, this can take several
                    minutes depending of your hardware...</Typography.Text>}
        </Col>
    </Row>
}

export default UpdatesPage;