export const useSSE = <T>(uri: string, onError: (e: Error) => void, onInfo: (msg: string) => void, onData: (data: T, first?: boolean) => void) => {
    let stream: EventSource | null = null;
    const start = () => {
        let first = true;
        stream?.close();
        stream = null
        stream = new EventSource(uri);
        stream.onopen = function () {
            console.log(`Opened stream ${uri}`)
            onInfo("Stream connected")
        }
        stream.onerror = function () {
            console.log(`Error on stream ${uri}`)
            onError(new Error("Stream error"))
            stream?.close();
            stream = null
        };
        stream.onmessage = function (e) {
            onData(atob(e.data) as T, first);
            if (first) {
                first = false;
            }
        };
    };
    const stop = () => {
        console.log(`Closing stream ${uri}`)
        stream?.close();
        stream = null
    }
    return {start, stop}
}