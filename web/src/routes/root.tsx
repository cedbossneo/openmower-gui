import {Outlet, useMatches, useNavigate} from "react-router-dom";
import {Row, Col, Menu, MenuProps} from "antd";
import {SettingOutlined, MessageOutlined} from '@ant-design/icons';

let menu: MenuProps['items'] = [
    {
        key: '/settings',
        label: 'Settings',
        icon: <SettingOutlined/>
    },
    {
        key: '/logs',
        label: 'Logs',
        icon: <MessageOutlined/>
    },
];

export default () => {
    const route = useMatches()
    const navigate = useNavigate()
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
