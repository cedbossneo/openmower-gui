import {Outlet, useMatches, useNavigate} from "react-router-dom";
import {Layout, Menu, MenuProps, Typography} from "antd";
import {
    ApiOutlined,
    ClockCircleOutlined,
    HeatMapOutlined,
    MessageOutlined,
    RobotOutlined,
    RocketFilled,
    RocketOutlined,
    SettingOutlined
} from '@ant-design/icons';
import {useEffect, useState} from "react";
import {MowerStatus} from "../components/MowerStatus.tsx";
import {COLORS} from "../theme/colors.ts";

const menu: MenuProps['items'] = [
    {
        key: '/openmower',
        label: 'OpenMower',
        icon: <RobotOutlined/>
    },
    {
        key: '/setup',
        label: 'Setup',
        icon: <RocketOutlined/>
    },
    {
        key: '/settings',
        label: 'Settings',
        icon: <SettingOutlined/>
    },
    {
        key: '/map',
        label: 'Map',
        icon: <HeatMapOutlined/>
    },
    {
        key: '/schedule',
        label: 'Schedule',
        icon: <ClockCircleOutlined/>
    },
    {
        key: '/integrations',
        label: 'Integrations',
        icon: <ApiOutlined/>
    },
    {
        key: '/logs',
        label: 'Logs',
        icon: <MessageOutlined/>
    },
    {
        key: 'new',
        label: <span className={"beamerTrigger"}>What's new</span>,
        icon: <RocketFilled/>,
    }
];

const pageTitles: Record<string, string> = {
    '/openmower': 'Dashboard',
    '/setup': 'Setup',
    '/settings': 'Settings',
    '/map': 'Map',
    '/schedule': 'Schedule',
    '/integrations': 'Integrations',
    '/logs': 'Logs',
};

export default () => {
    const route = useMatches()
    const navigate = useNavigate()
    const [collapsed, setCollapsed] = useState(false)

    useEffect(() => {
        if (route.length === 1 && route[0].pathname === "/") {
            navigate({
                pathname: '/openmower',
            })
        }
    }, [route, navigate])

    const currentPath = route.length > 1 ? route[1].pathname : '/openmower';
    const pageTitle = pageTitles[currentPath] ?? 'OpenMower';

    return (
        <Layout style={{height: "100%"}}>
            <Layout.Sider
                breakpoint="lg"
                collapsedWidth="0"
                zeroWidthTriggerStyle={{top: 0}}
                onCollapse={setCollapsed}
            >
                {!collapsed && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '16px 24px',
                        borderBottom: `1px solid ${COLORS.border}`,
                    }}>
                        <RobotOutlined style={{fontSize: 24, color: COLORS.primary}}/>
                        <Typography.Text strong style={{fontSize: 18, color: COLORS.text}}>
                            Mowgli
                        </Typography.Text>
                    </div>
                )}
                <Menu theme="dark"
                      mode="inline"
                      onClick={(info) => {
                          if (info.key !== 'new') {
                              navigate({
                                  pathname: info.key,
                              })
                          }
                      }} selectedKeys={route.map(r => r.pathname)} items={menu}/>
            </Layout.Sider>
            <Layout style={{height: "100%"}}>
                <Layout.Header style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '0 24px',
                    background: COLORS.bgCard,
                    borderBottom: `1px solid ${COLORS.border}`,
                    height: 48,
                    lineHeight: '48px',
                    overflow: 'hidden',
                }}>
                    <Typography.Text strong style={{fontSize: 16, color: COLORS.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1, minWidth: 0}}>
                        {pageTitle}
                    </Typography.Text>
                    <MowerStatus/>
                </Layout.Header>
                <Layout.Content style={{padding: "10px 24px 0px 24px", height: "100%", overflow: "auto"}}>
                    <Outlet/>
                </Layout.Content>
            </Layout>
        </Layout>
    );
}
