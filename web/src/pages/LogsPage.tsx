import {Col, Row, Typography} from "antd";
import {useEffect, useState} from "react";
import Terminal, {ColorMode, TerminalOutput} from "react-terminal-ui";

export const LogsPage = () => {
    const [containerId, setContainerId] = useState<string | undefined>(undefined);
    const [data, setData] = useState<string[]>([])
    useEffect(() => {
        (async () => {
            const containerId = await fetch("/api/containers").then((res) => res.json()).then((containers) => {
                return containers.containers[0].Id;
            });
            setContainerId(containerId);
        })();
    }, [])
    useEffect(() => {
        if (containerId) {
            var stream = new EventSource(`/api/containers/${containerId}/logs`);
            stream.addEventListener("end", function () {
                console.log("end")
                stream.close();
            })
            stream.addEventListener("message", function (e) {
                setData((data) => {
                    data.push(atob(e.data));
                    return data
                })
            });
        }
    }, [containerId])
    return <Row>
        <Col span={24}>
            <Typography.Title level={2}>Container logs</Typography.Title>
        </Col>
        <Col span={24}>
            <Terminal colorMode={ ColorMode.Light }>
                {data.map((line, index) => {
                    return <TerminalOutput key={index}>{line}</TerminalOutput>
                })}
            </Terminal>
        </Col>
    </Row>
}

export default LogsPage;