import React, {useState} from 'react';
import {Submit} from '@formily/antd-v5'
import {CheckCircleOutlined} from '@ant-design/icons'
import {Button, Card, Col, Row, Steps, Typography} from "antd";
import {FlashBoardComponent} from "../components/FlashBoardComponent.tsx";
import {SettingsComponent} from "../components/SettingsComponent.tsx";
import AsyncButton from "../components/AsyncButton.tsx";
import {FlashGPSComponent} from "../components/FlashGPSComponent.tsx";
import {SettingsConfig} from "../hooks/useSettings.ts";

const {Step} = Steps;

const SetupWizard: React.FC = () => {
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        setCurrentStep(currentStep + 1);
    };

    const handlePrevious = () => {
        setCurrentStep(currentStep - 1);
    };

    const steps = [
        {
            title: 'Flash motherboard firmware',
            content: (
                <Card title={"Firmware configuration"} key={"flashBoard"}>
                    <FlashBoardComponent onNext={handleNext}/>
                </Card>
            ),
        },
        {
            title: 'Flash GPS configuration',
            content: (
                <Card title={"Flash GPS configuration"} key={"flashGPS"}>
                    <FlashGPSComponent onNext={handleNext} onPrevious={handlePrevious}/>
                </Card>
            ),
        },
        {
            title: 'Configure OpenMower',
            content: (
                <Card title={"Configure OpenMower"} key={"configureOpenMower"}>
                    <SettingsComponent contentStyle={{height: '55vh'}} actions={(form, save, restartOM, restartGUI) => {
                        return [
                            <Button onClick={handlePrevious}>Previous</Button>,
                            <Submit loading={form.loading} onSubmit={async (values: SettingsConfig) => {
                                await save(values);
                                await restartOM();
                                await restartGUI();
                                handleNext();
                            }}>Save and restart</Submit>,
                        ]
                    }}/>
                </Card>
            ),
        },
        {
            title: 'Setup complete',
            content: (
                <Card title={"Setup complete"} key={"complete"}>
                    <Row gutter={[16, 16]}>
                        <Col span={24} style={{textAlign: "center"}}>
                            <CheckCircleOutlined style={{fontSize: 48, color: 'green'}}
                            />
                            <Typography.Title level={2}>Congratulations, your Mower is now fully
                                configured</Typography.Title>
                        </Col>
                        <Col span={24} style={{textAlign: "center"}}>
                            <AsyncButton onAsyncClick={async () => {
                                window.location.href = "/#/openmower";
                            }}>Go to dashboard</AsyncButton>
                        </Col>
                    </Row>
                </Card>
            )
        }
    ];


    return <Row gutter={[16, 32]}>
        <Col span={24}>
            <Typography.Title level={2}>Setup</Typography.Title>
            <Typography.Title level={5} style={{color: "#ff0000"}}>WARNING: This setup wizard will flash your
                motherboard firmware and the GPS configuration. Run at your own risk and be careful with voltage
                settings if you change them.</Typography.Title>
        </Col>
        <Col span={24}>
            <Steps current={currentStep}>
                {steps.map((step) => (
                    <Step key={step.title} title={step.title}/>
                ))}
            </Steps>
        </Col>
        <Col span={24}>
            <div className="steps-content">{steps[currentStep].content}</div>
        </Col>
    </Row>;
};

export default SetupWizard;