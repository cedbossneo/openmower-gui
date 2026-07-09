import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import {useManualMode} from './useManualMode.ts';

describe('useManualMode', () => {
    let mowerAction: (action: string, params: Record<string, unknown>) => () => Promise<void>;
    let sendJsonMessage: (msg: unknown) => void;
    let startStream: (uri: string) => void;

    beforeEach(() => {
        mowerAction = vi.fn(() => vi.fn().mockResolvedValue(undefined));
        sendJsonMessage = vi.fn();
        startStream = vi.fn();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    function renderManualMode() {
        return renderHook(() =>
            useManualMode({
                mowerAction,
                joyStream: {sendJsonMessage, start: startStream},
            })
        );
    }

    it('starts with manual mode off', () => {
        const {result} = renderManualMode();
        expect(result.current.manualMode).toBeUndefined();
    });

    it('handleManualMode activates manual mode with blade off', async () => {
        const {result} = renderManualMode();
        await act(async () => {
            await result.current.handleManualMode();
        });
        expect(startStream).toHaveBeenCalledWith('/api/openmower/publish/joy');
        expect(mowerAction).toHaveBeenCalledWith('high_level_control', {Command: 3});
        // Blade must NOT be commanded on at entry.
        expect(mowerAction).not.toHaveBeenCalledWith('action', {Data: 'mower_logic:area_recording/start_manual_mowing'});
        expect(result.current.manualMode).toBeDefined();
        expect(result.current.bladeOn).toBe(false);
    });

    it('handleStopManualMode deactivates manual mode and stops the blade', async () => {
        const {result} = renderManualMode();
        await act(async () => {
            await result.current.handleManualMode();
        });
        expect(result.current.manualMode).toBeDefined();

        await act(async () => {
            await result.current.handleStopManualMode();
        });
        expect(mowerAction).toHaveBeenCalledWith('action', {Data: 'mower_logic:area_recording/stop_manual_mowing'});
        expect(mowerAction).toHaveBeenCalledWith('high_level_control', {Command: 2});
        expect(result.current.manualMode).toBeUndefined();
        expect(result.current.bladeOn).toBe(false);
    });

    it('toggleBlade turns the blade on then off via xbot/action', async () => {
        const {result} = renderManualMode();

        await act(async () => {
            await result.current.toggleBlade();
        });
        expect(mowerAction).toHaveBeenCalledWith('action', {Data: 'mower_logic:area_recording/start_manual_mowing'});
        expect(result.current.bladeOn).toBe(true);

        await act(async () => {
            await result.current.toggleBlade();
        });
        expect(mowerAction).toHaveBeenCalledWith('action', {Data: 'mower_logic:area_recording/stop_manual_mowing'});
        expect(result.current.bladeOn).toBe(false);
    });

    it('reconciles bladeOn from the real mow_enabled (survives remount / external change)', () => {
        const {result, rerender} = renderHook(
            ({me}: {me?: boolean}) =>
                useManualMode({mowerAction, joyStream: {sendJsonMessage, start: startStream}, mowEnabled: me}),
            {initialProps: {me: undefined as boolean | undefined}}
        );
        expect(result.current.bladeOn).toBe(false);
        rerender({me: true});
        expect(result.current.bladeOn).toBe(true);
        rerender({me: false});
        expect(result.current.bladeOn).toBe(false);
    });

    it('handleJoyMove sends twist message', () => {
        const {result} = renderManualMode();
        act(() => {
            result.current.handleJoyMove({x: 0.5, y: 0.8} as any);
        });
        expect(sendJsonMessage).toHaveBeenCalledWith({
            Linear: {X: 0.8, Y: 0, Z: 0},
            Angular: {Z: -0.5, X: 0, Y: 0},
        });
    });

    it('handleJoyStop sends zero velocity', () => {
        const {result} = renderManualMode();
        act(() => {
            result.current.handleJoyStop();
        });
        expect(sendJsonMessage).toHaveBeenCalledWith({
            Linear: {X: 0, Y: 0, Z: 0},
            Angular: {Z: 0, X: 0, Y: 0},
        });
    });

    it('handleJoyMove handles null x/y', () => {
        const {result} = renderManualMode();
        act(() => {
            result.current.handleJoyMove({x: null, y: null} as any);
        });
        expect(sendJsonMessage).toHaveBeenCalledWith({
            Linear: {X: 0, Y: 0, Z: 0},
            Angular: {Z: -0, X: 0, Y: 0},
        });
    });
});
