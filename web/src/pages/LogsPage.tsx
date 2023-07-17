import {Button, Col, notification, Row, Select, Typography} from "antd";
import {useEffect, useState} from "react";
import Terminal, {ColorMode, TerminalOutput} from "react-terminal-ui";
import styled from "styled-components";

const StyledTerminal = styled.div`
  div.react-terminal-wrapper {
    padding-top: 35px;
  }

  div.react-terminal-wrapper > div.react-terminal-window-buttons {
    display: none;
  }
`;

let stream: null | EventSource = null;

export const LogsPage = () => {
    const [api, contextHolder] = notification.useNotification();
    const [containers, setContainers] = useState<{ value: string, label: string, status: "started" | "stopped" }[]>([]);
    const [containerId, setContainerId] = useState<string | undefined>(undefined);
    const [data, setData] = useState<string[]>([])

    async function listContainers() {
        try {
            const containers = await fetch("/api/containers").then((res) => res.json()).then((containers) => {
                if (containers.error) {
                    throw new Error(containers.error)
                }
                return containers.containers;
            });
            let options = containers.map((container: any) => {
                return {
                    label: `${container.Labels.app} ( ${container.Names[0].replace("/", "")} )`,
                    value: container.Id,
                    status: container.State == "running" ? "started" : "stopped"
                }
            });
            setContainers(options)
            if (options.length > 0 && !containerId) {
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

    const streamContainerLogs = () => {
        let first = true;
        stream?.close();
        stream = null
        stream = new EventSource(`/api/containers/${containerId}/logs`);
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
            setData((data) => {
                if (first) {
                    first = false;
                    return [atob(e.data)];
                }
                data.push(atob(e.data));
                return data
            })
        };
    };

    useEffect(() => {
        if (containerId) {
            streamContainerLogs();
        }
    }, [containerId])
    const commandContainer = (command: "start" | "stop" | "restart") => async () => {
        const messages = {
            "start": "Container started",
            "stop": "Container stopped",
            "restart": "Container restarted"
        };
        try {
            await fetch(`/api/containers/${containerId}/${command}`, {
                method: "POST"
            }).then((res) => res.json()).then((res) => {
                if (res.error) {
                    throw new Error(res.error)
                }
            });
            if (command === "start" || command === "restart") {
                streamContainerLogs();
            } else {
                stream?.close();
            }
            await listContainers();
            api.success({
                message: messages[command],
            })
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
                    <Button onClick={commandContainer("restart")} style={{marginRight: 10}}>Restart</Button>
                    <Button onClick={commandContainer("stop")}>Stop</Button>
                </>
            }
            {
                selectedContainer && selectedContainer.status === "stopped" &&
                <Button onClick={commandContainer("start")}>Start</Button>
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