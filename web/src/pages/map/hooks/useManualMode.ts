import {useCallback, useEffect, useRef, useState} from "react";
import type {Twist} from "../../../types/ros.ts";
import type {IJoystickUpdateEvent} from "react-joystick-component/build/lib/Joystick";

const JOY_SEND_INTERVAL_MS = 100;

// Behavior actions handled by AreaRecordingBehavior in mower_logic, published to
// the xbot/action topic. Toggling the blade during manual mowing must go through
// these: the mower_logic safety loop continuously forces the blade to match the
// behavior's manual_mowing flag, so a direct mow_enabled service call is undone
// within ~0.5s. These actions flip that flag, which the safety loop honors.
const START_MANUAL_MOWING = "mower_logic:area_recording/start_manual_mowing";
const STOP_MANUAL_MOWING = "mower_logic:area_recording/stop_manual_mowing";

interface UseManualModeOptions {
    mowerAction: (action: string, params: Record<string, unknown>) => () => Promise<void>;
    joyStream: { sendJsonMessage: (msg: unknown) => void; start: (uri: string) => void };
    // Live blade state from /ll/mower_status.mow_enabled (the source of truth).
    mowEnabled?: boolean;
}

export function useManualMode({mowerAction, joyStream, mowEnabled}: UseManualModeOptions) {
    const [manualMode, setManualMode] = useState<number | undefined>();
    const [bladeOn, setBladeOn] = useState(false);
    const lastTwistRef = useRef<Twist | null>(null);
    const joyIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

    // Reconcile the displayed blade state with the real mow_enabled so it survives
    // navigating away and back (MapPage remount) and any external blade change. Fires
    // only when the real value changes, so optimistic toggles don't flicker.
    useEffect(() => {
        if (mowEnabled !== undefined) {
            setBladeOn(mowEnabled);
        }
    }, [mowEnabled]);

    const startJoyInterval = useCallback(() => {
        clearInterval(joyIntervalRef.current);
        joyIntervalRef.current = setInterval(() => {
            if (lastTwistRef.current) {
                joyStream.sendJsonMessage(lastTwistRef.current);
            }
        }, JOY_SEND_INTERVAL_MS);
    }, [joyStream]);

    const stopJoyInterval = useCallback(() => {
        clearInterval(joyIntervalRef.current);
        joyIntervalRef.current = undefined;
    }, []);

    const handleManualMode = async () => {
        // Start the joy WebSocket immediately so it's ready when the user moves the joystick.
        // Don't wait for the AREA_RECORDING state to propagate back via highLevelStatus.
        joyStream.start("/api/openmower/publish/joy");
        await mowerAction("high_level_control", {Command: 3})();
        // Blade stays off until the user explicitly toggles it on (safer entry).
        setBladeOn(false);
        setManualMode(1);
    };

    const handleStopManualMode = async () => {
        // Command the blade off via the behavior while AREA_RECORDING is still active,
        // then transition home.
        await mowerAction("action", {Data: STOP_MANUAL_MOWING})();
        setBladeOn(false);
        setManualMode(undefined);
        stopJoyInterval();
        lastTwistRef.current = null;
        await mowerAction("high_level_control", {Command: 2})();
    };

    const toggleBlade = useCallback(async () => {
        const next = !bladeOn;
        await mowerAction("action", {Data: next ? START_MANUAL_MOWING : STOP_MANUAL_MOWING})();
        setBladeOn(next);
    }, [bladeOn, mowerAction]);

    const handleJoyMove = useCallback((event: IJoystickUpdateEvent) => {
        const msg: Twist = {
            Linear: {X: event.y ?? 0, Y: 0, Z: 0},
            Angular: {Z: (event.x ?? 0) * -1, X: 0, Y: 0},
        };
        lastTwistRef.current = msg;
        joyStream.sendJsonMessage(msg);
        // Start the repeat interval if not already running
        if (!joyIntervalRef.current) {
            startJoyInterval();
        }
    }, [joyStream, startJoyInterval]);

    const handleJoyStop = useCallback(() => {
        const msg: Twist = {
            Linear: {X: 0, Y: 0, Z: 0},
            Angular: {Z: 0, X: 0, Y: 0},
        };
        lastTwistRef.current = null;
        stopJoyInterval();
        joyStream.sendJsonMessage(msg);
    }, [joyStream, stopJoyInterval]);

    return {manualMode, bladeOn, handleManualMode, handleStopManualMode, toggleBlade, handleJoyMove, handleJoyStop};
}
