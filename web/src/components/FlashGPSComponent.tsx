import {App, Button, Col, Modal, Row, Typography} from "antd";
import {useState} from "react";
import {fetchEventSource} from "@microsoft/fetch-event-source";
import {FormButtonGroup} from "@formily/antd-v5";
import {StyledTerminal} from "./StyledTerminal.tsx";
import Terminal, {ColorMode, TerminalOutput} from "react-terminal-ui";
import AsyncButton from "./AsyncButton.tsx";

export const FlashGPSComponent = (props: { onNext: () => void, onPrevious: () => void }) => {
    const {notification} = App.useApp();
    const [data, setData] = useState<string[]>()
    const flashGPS = async () => {
        try {
            console.log({
                message: "Flashing firmware",
            });
            await fetchEventSource(`/api/setup/flashGPS`, {
                method: "POST",
                keepalive: false,
                headers: {
                    Accept: "text/event-stream",
                },
                onopen(res) {
                    if (res.ok && res.status === 200) {
                        console.log({
                            message: "Connected to log stream",
                        });
                    } else if (
                        res.status >= 400 &&
                        res.status < 500 &&
                        res.status !== 429
                    ) {
                        notification.error({
                            message: "Error retrieving log stream",
                            description: res.statusText,
                        });
                    }
                    setData([])
                    return Promise.resolve()
                },
                onmessage(event) {
                    if (event.event == "end") {
                        notification.success({
                            message: "GPS flashed",
                        });
                        setTimeout(() => {
                            props.onNext();
                        }, 10000);
                        return;
                    } else if (event.event == "error") {
                        notification.error({
                            message: "Error flashing gps",
                            description: event.data,
                        });
                        return;
                    } else {
                        setData((data) => [...(data ?? []), event.data]);
                    }
                },
                onclose() {
                    notification.success({
                        message: "Logs stream closed",
                    });
                },
                onerror(err) {
                    notification.error({
                        message: "Error retrieving log stream",
                        description: err.toString(),
                    });
                },
            });
        } catch (e: any) {
            notification.error({
                message: "Error flashing gps",
                description: e.toString(),
            });
        }
    };
    return <Row>
        <Col span={24} style={{textAlign: "center"}}>
            <Typography.Title level={4}>
                Click on the button below to flash your uBlox Z-F9P GPS Configuration.
            </Typography.Title>
            <Modal
                title="GPS logs"
                width={"70%"}
                open={(data && data.length > 0)}
                cancelButtonProps={{style: {display: "none"}}}
                onOk={() => {
                    setData([])
                }}
            >
                <StyledTerminal>
                    <Terminal colorMode={ColorMode.Light}>
                        {(data ?? []).map((line, index) => {
                            return <TerminalOutput key={index}>{line}</TerminalOutput>;
                        })}
                    </Terminal>
                </StyledTerminal>
            </Modal>
        </Col>
        <Col span={24} style={{position: "fixed", bottom: 20}}>
            <FormButtonGroup>
                <Button onClick={props.onPrevious}>Previous</Button>
                <AsyncButton type={"primary"} onAsyncClick={flashGPS}>Flash GPS Configuration</AsyncButton>
                <Button onClick={props.onNext}>Skip</Button>
            </FormButtonGroup>
        </Col> </Row>;
};