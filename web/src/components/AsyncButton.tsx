import {Button, ButtonProps} from "antd";
import * as React from "react";

export const AsyncButton: React.FC<ButtonProps & {
    onAsyncClick: (event: React.MouseEvent<HTMLAnchorElement> & React.MouseEvent<HTMLButtonElement>) => Promise<any>
}> = (props) => {
    const {onAsyncClick, ...rest} = props;
    const [loading, setLoading] = React.useState(false)
    const handleClick = (event: React.MouseEvent<HTMLAnchorElement> & React.MouseEvent<HTMLButtonElement>) => {
        if (props.onChange !== undefined) {
            props.onChange(event)
        } else if (onAsyncClick !== undefined) {
            setLoading(true)
            onAsyncClick(event).then(() => {
                setLoading(false)
            }).catch(() => {
                setLoading(false)
            })
        }
    }
    return <Button loading={loading} onClick={handleClick} {...rest}>{props.children}</Button>
}

export default AsyncButton;