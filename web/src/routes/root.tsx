import {Outlet, useMatches, useNavigate} from "react-router-dom";
import {Layout, Menu, MenuProps} from "antd";
import {
    DownloadOutlined,
    HeatMapOutlined,
    MessageOutlined,
    RobotOutlined,
    RocketOutlined,
    SettingOutlined
} from '@ant-design/icons';
import {useEffect} from "react";

let menu: MenuProps['items'] = [
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
        key: '/logs',
        label: 'Logs',
        icon: <MessageOutlined/>
    },
    {
        key: '/updates',
        label: 'Updates',
        icon: <DownloadOutlined/>
    }
];

export default () => {
    const route = useMatches()
    const navigate = useNavigate()
    useEffect(() => {
        if (route.length === 1 && route[0].pathname === "/") {
            navigate({
                pathname: '/openmower',
            })
        }
    }, [route, navigate])
    return (
        <Layout style={{height: "100%"}}>
            <Layout.Sider breakpoint="lg"
                          collapsedWidth="0"
                          zeroWidthTriggerStyle={{top: 0}}
            >
                <Menu theme="dark"
                      mode="inline"
                      onClick={(info) =>
                    navigate({
                        pathname: info.key,
                    })} selectedKeys={route.map(r => r.pathname)} items={menu}/>
            </Layout.Sider>
            <Layout style={{height: "100%"}}>
                <Layout.Content style={{padding: "10px 24px 0px 24px", height: "100%", backgroundColor: 'white'}}>
                    <Outlet/>
                </Layout.Content>
            </Layout>
        </Layout>);
}
