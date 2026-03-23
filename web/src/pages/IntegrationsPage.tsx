import React, {useEffect, useState} from "react";
import {App, Badge, Button, Card, Col, Collapse, Form, Input, Row, Space, Switch, Typography} from "antd";
import {
    ApiOutlined,
    AppleOutlined,
    HomeOutlined,
} from "@ant-design/icons";
import {useConfig} from "../hooks/useConfig.tsx";
import {COLORS} from "../theme/colors.ts";

interface IntegrationConfig {
    enabledKey: string;
    settingKeys: string[];
}

const HA_CONFIG: IntegrationConfig = {
    enabledKey: "system.ha.enabled",
    settingKeys: [
        "system.ha.enabled",
        "system.ha.mqtt.hostname",
        "system.ha.mqtt.port",
        "system.ha.mqtt.user",
        "system.ha.mqtt.password",
        "system.ha.device.name",
    ],
};

const HOMEKIT_CONFIG: IntegrationConfig = {
    enabledKey: "system.homekit.enabled",
    settingKeys: [
        "system.homekit.enabled",
        "system.homekit.pincode",
    ],
};

const MQTT_CONFIG: IntegrationConfig = {
    enabledKey: "system.mqtt.enabled",
    settingKeys: [
        "system.mqtt.enabled",
        "system.mqtt.host",
        "system.mqtt.prefix",
    ],
};

const ALL_KEYS = [
    ...HA_CONFIG.settingKeys,
    ...HOMEKIT_CONFIG.settingKeys,
    ...MQTT_CONFIG.settingKeys,
];

const IntegrationCard: React.FC<{
    icon: React.ReactNode;
    title: string;
    description: string;
    requirements?: string;
    config: IntegrationConfig;
    fields: { key: string; label: string; help?: string; password?: boolean }[];
    values: Record<string, string>;
    onToggle: (enabled: boolean) => void;
    onSave: (updated: Record<string, string>) => void;
    saving: boolean;
}> = ({icon, title, description, requirements, config, fields, values, onToggle, onSave, saving}) => {
    const enabled = values[config.enabledKey] === "true";
    const [form] = Form.useForm();

    useEffect(() => {
        const formValues: Record<string, string> = {};
        for (const f of fields) {
            formValues[f.key] = values[f.key] ?? "";
        }
        form.setFieldsValue(formValues);
    }, [values, fields, form]);

    const handleToggle = (checked: boolean) => {
        onToggle(checked);
    };

    const handleSave = () => {
        form.validateFields().then((formValues) => {
            onSave(formValues);
        });
    };

    return (
        <Card
            style={{height: "100%"}}
            styles={{body: {display: "flex", flexDirection: "column", height: "100%"}}}
        >
            <Space direction="vertical" size={12} style={{width: "100%", flex: 1}}>
                <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                    <Space size={12}>
                        <span style={{fontSize: 28}}>{icon}</span>
                        <div>
                            <Typography.Text strong style={{fontSize: 16}}>{title}</Typography.Text>
                            <Badge
                                status={enabled ? "success" : "default"}
                                text={enabled ? "Active" : "Inactive"}
                                style={{marginLeft: 12, fontSize: 12, color: COLORS.muted}}
                            />
                        </div>
                    </Space>
                    <Switch checked={enabled} onChange={handleToggle} loading={saving}/>
                </div>

                <Typography.Text type="secondary" style={{fontSize: 13}}>
                    {description}
                </Typography.Text>

                {requirements && (
                    <Typography.Text type="warning" style={{fontSize: 12}}>
                        {requirements}
                    </Typography.Text>
                )}

                {fields.length > 0 && (
                    <Collapse
                        ghost
                        size="small"
                        items={[{
                            key: "settings",
                            label: <Typography.Text style={{fontSize: 13}}>Configuration</Typography.Text>,
                            children: (
                                <Form form={form} layout="vertical" size="small">
                                    {fields.map((f) => (
                                        <Form.Item
                                            key={f.key}
                                            name={f.key}
                                            label={f.label}
                                            help={f.help}
                                            style={{marginBottom: 8}}
                                        >
                                            {f.password
                                                ? <Input.Password placeholder={f.label}/>
                                                : <Input placeholder={f.label}/>
                                            }
                                        </Form.Item>
                                    ))}
                                    <Button type="primary" size="small" onClick={handleSave} loading={saving}>
                                        Save
                                    </Button>
                                </Form>
                            ),
                        }]}
                    />
                )}
            </Space>
        </Card>
    );
};

export const IntegrationsPage: React.FC = () => {
    const {notification} = App.useApp();
    const {config, setConfig} = useConfig(ALL_KEYS);
    const [saving, setSaving] = useState(false);

    const saveKeys = async (updated: Record<string, string>) => {
        setSaving(true);
        try {
            await setConfig(updated);
            notification.success({message: "Settings saved. Restart GUI for changes to take effect."});
        } catch {
            notification.error({message: "Failed to save settings"});
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (enabledKey: string, enabled: boolean) => {
        await saveKeys({[enabledKey]: enabled.toString()});
    };

    return (
        <Row gutter={[16, 16]}>
            <Col xs={24} lg={8}>
                <IntegrationCard
                    icon={<HomeOutlined style={{color: "#18bcf2"}}/>}
                    title="Home Assistant"
                    description="Auto-registers the mower in Home Assistant via MQTT Discovery. Creates a lawn_mower entity, sensors, buttons, and GPS device tracker."
                    requirements="Requires OM_MQTT_ENABLE=True in mower config and an MQTT broker reachable by both HA and this device."
                    config={HA_CONFIG}
                    fields={[
                        {key: "system.ha.mqtt.hostname", label: "MQTT Broker Hostname", help: "Leave empty to use OM_MQTT_HOSTNAME from mower config"},
                        {key: "system.ha.mqtt.port", label: "MQTT Broker Port"},
                        {key: "system.ha.mqtt.user", label: "MQTT Username"},
                        {key: "system.ha.mqtt.password", label: "MQTT Password", password: true},
                        {key: "system.ha.device.name", label: "Device Name in HA"},
                    ]}
                    values={config}
                    onToggle={(v) => handleToggle(HA_CONFIG.enabledKey, v)}
                    onSave={saveKeys}
                    saving={saving}
                />
            </Col>
            <Col xs={24} lg={8}>
                <IntegrationCard
                    icon={<AppleOutlined style={{color: "#a2aaad"}}/>}
                    title="HomeKit"
                    description="Exposes the mower as a HomeKit switch. Control mowing on/off from the Apple Home app or Siri."
                    config={HOMEKIT_CONFIG}
                    fields={[
                        {key: "system.homekit.pincode", label: "Pin Code", help: "8-digit code to pair with HomeKit (default: 00102003)"},
                    ]}
                    values={config}
                    onToggle={(v) => handleToggle(HOMEKIT_CONFIG.enabledKey, v)}
                    onSave={saveKeys}
                    saving={saving}
                />
            </Col>
            <Col xs={24} lg={8}>
                <IntegrationCard
                    icon={<ApiOutlined style={{color: COLORS.primary}}/>}
                    title="GUI MQTT Broker"
                    description="Runs an embedded MQTT broker that bridges ROS topics. Used by the web UI for real-time updates."
                    config={MQTT_CONFIG}
                    fields={[
                        {key: "system.mqtt.host", label: "Listen Address", help: "e.g. :1883"},
                        {key: "system.mqtt.prefix", label: "Topic Prefix", help: "e.g. /gui"},
                    ]}
                    values={config}
                    onToggle={(v) => handleToggle(MQTT_CONFIG.enabledKey, v)}
                    onSave={saveKeys}
                    saving={saving}
                />
            </Col>
        </Row>
    );
};

export default IntegrationsPage;
