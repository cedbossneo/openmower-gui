import {Outlet, useMatches, useNavigate} from "react-router-dom";
import {Col, Menu, MenuProps, Row} from "antd";
import {HeatMapOutlined, MessageOutlined, RobotOutlined, RocketOutlined, SettingOutlined} from '@ant-design/icons';
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
        <Row style={{height: '100%'}}>
            <Col span={4} style={{height: '100%'}}>
                <Menu style={{height: '100%'}} onClick={(info) =>
                    navigate({
                        pathname: info.key,
                    })} selectedKeys={route.map(r => r.pathname)} mode="vertical" items={menu}/>
            </Col>
            <Col span={20} style={{
                padding: '0 24px',
                height: '100%',
            }}>
                <Outlet/>
            </Col>
        </Row>);
}
