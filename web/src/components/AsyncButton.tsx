import {Button, ButtonProps} from "antd";
import * as React from "react";

export const AsyncButton: React.FC<ButtonProps & {
    onAsyncClick: (event: React.MouseEvent<HTMLAnchorElement> & React.MouseEvent<HTMLButtonElement>) => Promise<any>
}> = (props) => {
    const [loading, setLoading] = React.useState(false)
    const handleClick = (event: React.MouseEvent<HTMLAnchorElement> & React.MouseEvent<HTMLButtonElement>) => {
        if (props.onChange !== undefined) {
            props.onChange(event)
        } else if (props.onAsyncClick !== undefined) {
            setLoading(true)
            props.onAsyncClick(event).then(() => {
                setLoading(false)
            }).catch(() => {
                setLoading(false)
            })
        }
    }
    return <Button loading={loading} onClick={handleClick} {...props}>{props.children}</Button>
}

export default AsyncButton;