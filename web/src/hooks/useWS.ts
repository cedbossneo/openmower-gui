import useWebSocket from "react-use-websocket";
import {useState} from "react";

export const useWS = <T>(onError: (e: Error) => void, onInfo: (msg: string) => void, onData: (data: T, first?: boolean) => void) => {
    const [uri, setUri] = useState<string | null>(null);
    const [first, setFirst] = useState(false)
    const ws = useWebSocket(uri, {
        share: true,
        onOpen: () => {
            console.log(`Opened stream ${uri}`)
            onInfo("Stream connected")
        },
        onError: () => {
            console.log(`Error on stream ${uri}`)
            onError(new Error(`Stream error`))
        },
        onClose: () => {
            console.log(`Stream closed ${uri}`)
            onError(new Error(`Stream closed`))
        },
        onMessage: (e) => {
            if (first) {
                setFirst(false)
            }
            onData(atob(e.data) as T, first);
        }
    });
    const start = (uri: string) => {
        setFirst(true)
        setUri(`ws://${window.location.host}${uri}`)
    };
    const stop = () => {
        console.log(`Closing stream ${ws.getWebSocket()?.url}`)
        setUri(null)
        setFirst(false)
    }
    return {start, stop, sendJsonMessage: ws.sendJsonMessage}
}