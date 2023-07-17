import {Switch, SwitchProps} from "antd";
import * as React from "react";

export const AsyncSwitch: React.FC<SwitchProps & {
    onAsyncChange: (checked: boolean, event: React.MouseEvent<HTMLButtonElement>) => Promise<any>
}> = (props) => {
    const [loading, setLoading] = React.useState(false)
    const handleChange = (checked: boolean, event: React.MouseEvent<HTMLButtonElement>) => {
        if (props.onChange !== undefined) {
            props.onChange(checked, event)
        } else if (props.onAsyncChange !== undefined) {
            setLoading(true)
            props.onAsyncChange(checked, event).then(() => {
                setLoading(false)
            }).catch(() => {
                setLoading(false)
            })
        }
    }
    return <Switch loading={loading} onChange={handleChange} {...props}/>
}

export default AsyncSwitch;