import {CheckCircleTwoTone, CloseCircleTwoTone} from "@ant-design/icons";
import {Progress} from "antd";

export const booleanFormatter = (value: any) => (value === "On" || value === "Yes") ?
    <CheckCircleTwoTone twoToneColor={"#01d30d"}/> : <CloseCircleTwoTone twoToneColor={"red"}/>;
export const booleanFormatterInverted = (value: any) => (value === "On" || value === "Yes") ?
    <CheckCircleTwoTone twoToneColor={"red"}/> : <CloseCircleTwoTone twoToneColor={"#01d30d"}/>;
export const stateRenderer = (value: string | undefined) => {
    switch (value) {
        case "IDLE":
            return "Idle"
        case "MOWING":
            return "Mowing"
        case "DOCKING":
            return "Docking"
        case "UNDOCKING":
            return "Undocking"
        case "AREA_RECORDING":
            return "Area Recording"
        default:
            return "Unknown"
    }
};
export const progressFormatter = (value: any) => {
    return <Progress steps={3} percent={value} size={25} showInfo={false}/>
};