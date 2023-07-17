import {Outlet, useMatches, useNavigate} from "react-router-dom";
import {Col, Menu, MenuProps, Row} from "antd";
import {MessageOutlined, RobotOutlined, SettingOutlined} from '@ant-design/icons';
import {useEffect} from "react";

let menu: MenuProps['items'] = [
    {
        key: '/openmower',
        label: 'OpenMower',
        icon: <RobotOutlined/>
    },
    {
        key: '/settings',
        label: 'Settings',
        icon: <SettingOutlined/>
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
        <Row>
            <Col span={4}>
                <Menu onClick={(info) =>
                    navigate({
                        pathname: info.key,
                    })} selectedKeys={route.map(r => r.pathname)} mode="vertical" items={menu}/>
            </Col>
            <Col span={20} style={{
                padding: '0 24px',
            }}>
                <Outlet/>
            </Col>
        </Row>);
}
