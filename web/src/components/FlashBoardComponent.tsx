import {App, Button, Col, Modal, Row} from "antd";
import {useEffect, useState} from "react";
import {fetchEventSource} from "@microsoft/fetch-event-source";
import {createSchemaField, FormProvider} from "@formily/react";
import {Checkbox, FormButtonGroup, FormItem, FormLayout, Input, NumberPicker, Select, Submit} from "@formily/antd-v5";
import {StyledTerminal} from "./StyledTerminal.tsx";
import Terminal, {ColorMode, TerminalOutput} from "react-terminal-ui";
import {createForm, onFieldValueChange} from "@formily/core";
import {useApi} from "../hooks/useApi.ts";

const SchemaField = createSchemaField({
    components: {
        Input,
        FormItem,
        Select,
        Checkbox,
        NumberPicker,
    },
})
type Config = {
    repository: string
    branch: string
    file: string
    version: string,
    boardType: string,
    panelType: string,
    debugType: string,
    disableEmergency: boolean,
    maxMps: number,
    maxChargeCurrent: number,
    limitVoltage150MA: number,
    maxChargeVoltage: number,
    batChargeCutoffVoltage: number,
    oneWheelLiftEmergencyMillis: number,
    bothWheelsLiftEmergencyMillis: number,
    tiltEmergencyMillis: number,
    stopButtonEmergencyMillis: number,
    playButtonClearEmergencyMillis: number,
    externalImuAcceleration: boolean,
    externalImuAngular: boolean,
    masterJ18: boolean,
    tickPerM: number,
    wheelBase: number
    perimeterWire: boolean
}

const form = createForm<Config>({
    effects() {
        onFieldValueChange('boardType', (field) => {
            form.setFieldState('*(panelType,tickPerM,wheelBase,branch,repository,debugType,disableEmergency,maxMps,maxChargeCurrent,limitVoltage150MA,maxChargeVoltage,batChargeCutoffVoltage,oneWheelLiftEmergencyMillis,bothWheelsLiftEmergencyMillis,tiltEmergencyMillis,stopButtonEmergencyMillis,playButtonClearEmergencyMillis,externalImuAcceleration,externalImuAngular,masterJ18,perimeterWire)', (state) => {
                //For the initial linkage, if the field cannot be found, setFieldState will push the update into the update queue until the field appears before performing the operation
                state.display = field.value !== "BOARD_VERMUT_YARDFORCE500" ? "visible" : "hidden";
            })
            form.setFieldState('*(version,file)', (state) => {
                //For the initial linkage, if the field cannot be found, setFieldState will push the update into the update queue until the field appears before performing the operation
                state.display = field.value === "BOARD_VERMUT_YARDFORCE500" ? "visible" : "hidden";
            })
        })
    },
})
export const FlashBoardComponent = (props: { onNext: () => void }) => {
    const guiApi = useApi();
    const {notification} = App.useApp();
    const [data, setData] = useState<string[]>()
    useEffect(() => {
        (async () => {
            try {
                const config = await guiApi.config.keysGetCreate({
                    "gui.firmware.config": ""
                })
                const jsonConfig = config.data["gui.firmware.config"]
                if (jsonConfig) {
                    form.setInitialValues(JSON.parse(jsonConfig))
                }
                if (config.error) {
                    throw new Error(config.error.error)
                }
                console.log({
                    message: "Retrieved config",
                });
            } catch (e: any) {
                notification.error({
                    message: "Error retrieving config",
                    description: e.toString(),
                });
            }
        })()
    }, []);
    const flashFirmware = async (values: Config) => {
        form.setLoading(true)
        try {
            console.log({
                message: "Flashing firmware",
            });
            await fetchEventSource(`/api/setup/flashBoard`, {
                method: "POST",
                keepalive: false,
                body: JSON.stringify(values),
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
                            message: "Firmware flashed",
                        });
                        setTimeout(() => {
                            props.onNext();
                        }, 10000);
                        form.setLoading(false)
                        return;
                    } else if (event.event == "error") {
                        notification.error({
                            message: "Error flashing firmware",
                            description: event.data,
                        });
                        form.setLoading(false)
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
                    form.setLoading(false)
                },
            });
        } catch (e: any) {
            notification.error({
                message: "Error flashing firmware",
                description: e.toString(),
            });
            form.setLoading(false)
        }
    };
    return <FormProvider form={form}>
        <Row>
            <Col span={24} style={{height: "55vh", overflowY: "auto"}}>
                <FormLayout layout="vertical">
                    <SchemaField><SchemaField.String
                        name={"boardType"}
                        title={"Board Selection"}
                        default={"BOARD_VERMUT_YARDFORCE500"}
                        enum={[{
                            label: "Vermut - YardForce 500 Classic",
                            value: "BOARD_VERMUT_YARDFORCE500"
                        }, {
                            label: "Mowgli - YardForce 500 Classic",
                            value: "BOARD_YARDFORCE500"
                        },
                            {
                                label: "Mowgli - LUV1000RI",
                                value: "BOARD_LUV1000RI"
                            }
                        ]} x-component="Select"
                        x-decorator="FormItem"/></SchemaField>
                    <SchemaField><SchemaField.String
                        name={"version"}
                        title={"Version"}
                        default={"0_13_X"}
                        enum={[{
                            label: "V0.13",
                            value: "0_13_X"
                        }, {
                            label: "V0.12 (LSM6DSO)",
                            value: "0_12_X_LSM6DSO"
                        },
                            {
                                label: "V0.12",
                                value: "0_12_X"
                            },
                            {
                                label: "V0.11 (MPU9250)",
                                value: "0_11_X_MPU9250"
                            },
                            {
                                label: "V0.11 (WT901)",
                                value: "0_11_X_WT901"
                            },
                            {
                                label: "V0.10 (MPU9250)",
                                value: "0_10_X_MPU9250"
                            },
                            {
                                label: "V0.10 (WT901)",
                                value: "0_10_X_WT901"
                            },
                            {
                                label: "V0.9 (MPU9250)",
                                value: "0_9_X_MPU9250"
                            },
                            {
                                label: "V0.9 (WT901 instead of sound)",
                                value: "0_9_X_WT901_INSTEAD_OF_SOUND"
                            }
                        ]} x-component="Select"
                        x-decorator="FormItem"/></SchemaField>
                    <SchemaField><SchemaField.String
                        name={"file"}
                        title={"Archive"}
                        default={"https://github.com/ClemensElflein/OpenMower/releases/download/latest/firmware.zip"}
                        x-decorator-props={{tooltip: "Archive to use for firmware"}}
                        x-component="Input"
                        x-decorator="FormItem"/></SchemaField>
                    <SchemaField><SchemaField.String
                        name={"repository"}
                        title={"Repository"}
                        default={"https://github.com/cedbossneo/mowgli"}
                        x-decorator-props={{tooltip: "Repository to use for firmware"}}
                        x-component="Input"
                        x-decorator="FormItem"/></SchemaField>
                    <SchemaField><SchemaField.String
                        name={"branch"}
                        title={"Branch"}
                        default={"main"}
                        x-decorator-props={{tooltip: "Branch to use for firmware"}}
                        x-component="Input"
                        x-decorator="FormItem"/></SchemaField>
                    <SchemaField><SchemaField.String
                        name={"panelType"}
                        title={"Panel Selection"}
                        default={"PANEL_TYPE_YARDFORCE_500_CLASSIC"}
                        enum={[
                            {
                                label: "YardForce 500 Classic",
                                value: "PANEL_TYPE_YARDFORCE_500_CLASSIC"
                            },
                            {
                                label: "YardForce LUV1000RI",
                                value: "PANEL_TYPE_YARDFORCE_LUV1000RI"
                            },
                            {
                                label: "YardForce 900 ECO",
                                value: "PANEL_TYPE_YARDFORCE_900_ECO"
                            }
                        ]} x-component="Select"
                        x-decorator="FormItem"/></SchemaField>

                    <SchemaField><SchemaField.String
                        name={"debugType"}
                        title={"Debug Type"}
                        default={"DEBUG_TYPE_UART"}
                        enum={[
                            {
                                label: "None",
                                value: "DEBUG_TYPE_NONE"
                            },
                            {
                                label: "Uart",
                                value: "DEBUG_TYPE_UART"
                            },
                            {
                                label: "Swo",
                                value: "DEBUG_TYPE_SWO"
                            }
                        ]} x-component="Select"
                        x-decorator="FormItem"/></SchemaField>
                    <SchemaField>
                        <SchemaField.Number
                            name={"maxMps"}
                            title={"Max MPS"}
                            default={0.5}
                            x-decorator-props={{tooltip: "Max speed in meters per second"}}
                            x-component-props={{step: 0.1, max: 1.0}}
                            x-component="NumberPicker"
                            x-decorator="FormItem"/>
                    </SchemaField>
                    <SchemaField>
                        <SchemaField.Number
                            name={"tickPerM"}
                            title={"Tick per meter"}
                            default={300.0}
                            x-decorator-props={{tooltip: "Number of wheel ticks per meter"}}
                            x-component-props={{step: 0.1}}
                            x-component="NumberPicker"
                            x-decorator="FormItem"/>
                    </SchemaField>
                    <SchemaField>
                        <SchemaField.Number
                            name={"wheelBase"}
                            title={"Wheel base"}
                            default={0.325}
                            x-decorator-props={{tooltip: "Wheel base in meters"}}
                            x-component-props={{step: 0.001}}
                            x-component="NumberPicker"
                            x-decorator="FormItem"/>
                    </SchemaField>
                    <SchemaField>
                        <SchemaField.Boolean
                            name={"disableEmergency"}
                            title={"Disable Emergency"}
                            default={false}
                            x-decorator-props={{tooltip: "Disable emergency stop"}}
                            x-component="Checkbox"
                            x-decorator="FormItem"/>
                    </SchemaField>
                    <SchemaField><SchemaField.Number
                        name={"maxChargeCurrent"}
                        title={"Max Charge Current"}
                        default={1.0}
                        x-component-props={{step: 0.1, max: 1.5}}
                        x-decorator-props={{tooltip: "Max charge current in Amps"}}
                        x-component="NumberPicker"
                        x-decorator="FormItem"/></SchemaField>
                    <SchemaField><SchemaField.Number
                        name={"limitVoltage150MA"}
                        title={"Limit Voltage 150mA"}
                        default={28.0}
                        x-decorator-props={{tooltip: "Voltage limit during slow charge in Volts"}}
                        x-component-props={{step: 0.1, max: 29.4}}
                        x-component="NumberPicker"
                        x-decorator="FormItem"/></SchemaField>
                    <SchemaField><SchemaField.Number
                        name={"maxChargeVoltage"}
                        title={"Max Charge Voltage"}
                        default={29.0}
                        x-decorator-props={{tooltip: "Max charge voltage in Volts"}}
                        x-component-props={{step: 0.1, max: 29.4}}
                        x-component="NumberPicker"
                        x-decorator="FormItem"/></SchemaField>
                    <SchemaField><SchemaField.Number
                        name={"batChargeCutoffVoltage"}
                        title={"Bat Charge Cutoff Voltage"}
                        default={28.0}
                        x-decorator-props={{tooltip: "Max battery voltage allowed in Volts"}}
                        x-component-props={{step: 0.1, max: 29.0}}
                        x-component="NumberPicker"
                        x-decorator="FormItem"/></SchemaField>
                    <SchemaField><SchemaField.Number
                        name={"oneWheelLiftEmergencyMillis"}
                        title={"One Wheel Lift Emergency Millis"}
                        default={10000}
                        x-decorator-props={{tooltip: "Time in milliseconds before emergency stop when one wheel is lifted"}}
                        x-component-props={{step: 1}}
                        x-component="NumberPicker"
                        x-decorator="FormItem"/></SchemaField>
                    <SchemaField><SchemaField.Number
                        name={"bothWheelsLiftEmergencyMillis"}
                        title={"Both Wheel Lift Emergency Millis"}
                        default={1000}
                        x-decorator-props={{tooltip: "Time in milliseconds before emergency stop when both wheels are lifted"}}
                        x-component-props={{step: 1}}
                        x-component="NumberPicker"
                        x-decorator="FormItem"/></SchemaField>
                    <SchemaField>
                        <SchemaField.Number
                            name={"tiltEmergencyMillis"}
                            title={"Tilt Emergency Millis"}
                            default={500}
                            x-decorator-props={{tooltip: "Time in milliseconds before emergency stop when mower is tilted"}}
                            x-component-props={{step: 1}}
                            x-component="NumberPicker"
                            x-decorator="FormItem"/>
                    </SchemaField>
                    <SchemaField>
                        <SchemaField.Number
                            name={"stopButtonEmergencyMillis"}
                            title={"Stop Button Emergency Millis"}
                            default={100}
                            x-decorator-props={{tooltip: "Time in milliseconds before emergency stop when stop button is pressed"}}
                            x-component-props={{step: 1}}
                            x-component="NumberPicker"
                            x-decorator="FormItem"/>
                    </SchemaField>
                    <SchemaField>
                        <SchemaField.Number
                            name={"playButtonClearEmergencyMillis"}
                            title={"Play Button Clear Emergency Millis"}
                            default={2000}
                            x-decorator-props={{tooltip: "Time in milliseconds before emergency stop is cleared when play button is pressed"}}
                            x-component-props={{step: 1}}
                            x-component="NumberPicker"
                            x-decorator="FormItem"/>
                    </SchemaField>
                    <SchemaField>
                        <SchemaField.Boolean
                            name={"externalImuAcceleration"}
                            title={"External IMU Acceleration"}
                            default={true}
                            x-decorator-props={{tooltip: "Use external IMU for acceleration"}}
                            x-component="Checkbox"
                            x-decorator="FormItem"/>
                    </SchemaField>
                    <SchemaField>
                        <SchemaField.Boolean
                            name={"externalImuAngular"}
                            title={"External IMU Angular"}
                            default={true}
                            x-decorator-props={{tooltip: "Use external IMU for angular"}}
                            x-component="Checkbox"
                            x-decorator="FormItem"/>
                    </SchemaField>
                    <SchemaField>
                        <SchemaField.Boolean
                            name={"masterJ18"}
                            title={"Master J18"}
                            default={true}
                            x-decorator-props={{tooltip: "Use J18 as master"}}
                            x-component="Checkbox"
                            x-decorator="FormItem"/>
                    </SchemaField>
                    <SchemaField>
                        <SchemaField.Boolean
                            name={"perimeterWire"}
                            title={"Use Perimeter wire"}
                            default={true}
                            x-decorator-props={{tooltip: "Use perimeter wire"}}
                            x-component="Checkbox"
                            x-decorator="FormItem"/>
                    </SchemaField>
                </FormLayout>
                <Modal
                    title="Firmware logs"
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
                    <Submit loading={form.loading} onSubmit={flashFirmware}>Flash Firmware</Submit>
                    <Button onClick={props.onNext}>Skip</Button>
                </FormButtonGroup>
            </Col> </Row>
    </FormProvider>;
};