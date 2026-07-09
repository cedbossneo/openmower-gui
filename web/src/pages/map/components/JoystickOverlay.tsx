import {Joystick} from "react-joystick-component";
import {IJoystickUpdateEvent} from "react-joystick-component/build/lib/Joystick";
import {CheckOutlined, HomeOutlined, ThunderboltOutlined} from "@ant-design/icons";
import AsyncButton from "../../../components/AsyncButton.tsx";

interface JoystickOverlayProps {
    visible: boolean;
    isRecording?: boolean;
    onMove: (event: IJoystickUpdateEvent) => void;
    onStop: () => void;
    onFinishRecording?: () => Promise<void>;
    onHome?: () => Promise<void>;
    bladeOn?: boolean;
    onToggleBlade?: () => Promise<void>;
}

export const JoystickOverlay = ({visible, isRecording, onMove, onStop, onFinishRecording, onHome, bladeOn, onToggleBlade}: JoystickOverlayProps) => {
    if (!visible) return null;
    const showSideColumn = isRecording || onToggleBlade;
    return (
        <div style={{position: "absolute", bottom: 30, right: 30, zIndex: 100, display: 'flex', alignItems: 'flex-end', gap: 12}}>
            {showSideColumn && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    marginBottom: 10,
                }}>
                    {isRecording && (
                        <>
                            <AsyncButton
                                type="primary"
                                icon={<CheckOutlined />}
                                onAsyncClick={onFinishRecording!}
                                style={{height: 44, borderRadius: 10, fontWeight: 600}}
                            >
                                Finish
                            </AsyncButton>
                            <AsyncButton
                                icon={<HomeOutlined />}
                                onAsyncClick={onHome!}
                                style={{height: 44, borderRadius: 10}}
                            >
                                Home
                            </AsyncButton>
                        </>
                    )}
                    {onToggleBlade && (
                        <AsyncButton
                            danger={bladeOn}
                            type={bladeOn ? "primary" : "default"}
                            icon={<ThunderboltOutlined />}
                            onAsyncClick={onToggleBlade}
                            style={{height: 44, borderRadius: 10, fontWeight: 600}}
                        >
                            {bladeOn ? "Blade ON" : "Start blade"}
                        </AsyncButton>
                    )}
                </div>
            )}
            <Joystick move={onMove} stop={onStop}/>
        </div>
    );
};
