import {Col, notification, Row, Select, Typography} from "antd";
import {useEffect, useState} from "react";
import Terminal, {ColorMode, TerminalOutput} from "react-terminal-ui";
import styled from "styled-components";
import AsyncButton from "../components/AsyncButton.tsx";
import {useSSE} from "../hooks/useSSE.ts";
import {useApi} from "../hooks/useApi.ts";

const StyledTerminal = styled.div`
  div.react-terminal-wrapper {
    padding-top: 35px;
  }

  div.react-terminal-wrapper > div.react-terminal-window-buttons {
    display: none;
  }
`;

type ContainerList = { value: string, label: string, status: "started" | "stopped" };
export const LogsPage = () => {
    const guiApi = useApi();
    const [api, contextHolder] = notification.useNotification();
    const [containers, setContainers] = useState<ContainerList[]>([]);
    const [containerId, setContainerId] = useState<string | undefined>(undefined);
    const [data, setData] = useState<string[]>([])
    const stream = useSSE<string>(`/api/containers/${containerId}/logs`, () => {
        api.error({
            message: "Logs stream closed",
        });
    }, () => {
        api.info({
            message: "Logs stream disconnected",
        })
    }, (e, first) => {
        setData((data) => {
            if (first) {
                first = false;
                return [e];
            }
            data.push(e);
            return data
        })
    });

    async function listContainers() {
        try {
            const containers = await guiApi.containers.containersList();
            if (containers.error) {
                throw new Error(containers.error.error)
            }
            let options = containers.data.containers?.flatMap<ContainerList>((container) => {
                if (!container.labels?.app || !container.names || !container.id) {
                    return [];
                }
                return [{
                    label: `${container.labels.app} ( ${container.names[0].replace("/", "")} )`,
                    value: container.id,
                    status: container.state == "running" ? "started" : "stopped"
                }]
            });
            setContainers(options ?? []);
            if (!!options?.length && !containerId) {
                setContainerId(options[0].value)
            }
        } catch (e: any) {
            api.error({
                message: "Failed to list containers",
                description: e.message
            })
        }
    }

    useEffect(() => {
        (async () => {
            await listContainers();
        })();
    }, [])

    useEffect(() => {
        if (containerId) {
            stream.start();
            return () => {
                stream?.stop();
            }
        }
    }, [containerId])
    const commandContainer = (command: "start" | "stop" | "restart") => async () => {
        const messages = {
            "start": "Container started",
            "stop": "Container stopped",
            "restart": "Container restarted"
        };
        try {
            if (containerId) {
                const res = await guiApi.containers.containersCreate(containerId, command);
                if (res.error) {
                    throw new Error(res.error.error)
                }
                if (command === "start" || command === "restart") {
                    stream.start();
                } else {
                    stream?.stop();
                }
                await listContainers();
                api.success({
                    message: messages[command],
                })
            }
        } catch (e: any) {
            api.error({
                message: `Failed to ${command} container`,
                description: e.message
            })
        }
    };
    const selectedContainer = containers.find((container) => container.value === containerId);
    return <Row>
        <Col span={24}>
            <Typography.Title level={2}>Container logs</Typography.Title>
        </Col>
        <Col span={24} style={{marginBottom: 20}}>
            <Select<string> options={containers} value={containerId} style={{marginRight: 10}} onSelect={(value) => {
                setContainerId(value);
            }}/>
            {
                selectedContainer && selectedContainer.status === "started" && <>
                    <AsyncButton onAsyncClick={commandContainer("restart")} style={{marginRight: 10}}>Restart</AsyncButton>
                    <AsyncButton onAsyncClick={commandContainer("stop")}>Stop</AsyncButton>
                </>
            }
            {
                selectedContainer && selectedContainer.status === "stopped" &&
                <AsyncButton onAsyncClick={commandContainer("start")}>Start</AsyncButton>
            }
        </Col>
        <Col span={24}>
            {contextHolder}
            <StyledTerminal>
                <Terminal colorMode={ColorMode.Light}>
                    {data.map((line, index) => {
                        return <TerminalOutput key={index}>{line}</TerminalOutput>
                    })}
                </Terminal>
            </StyledTerminal>
        </Col>
    </Row>
}

export default LogsPage;