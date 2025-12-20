import { useEffect, useRef } from 'react'

interface UseSSEConfig<T> {
    enabled?: boolean
    onEvent: (data: T) => void
    onError?: (error: any) => void
}

export function useSSE(
    url: string,
    { enabled = true, onEvent, onError }: UseSSEConfig<any>,
) {
    // useRef for keeping the function reference always updated
    // without needing to restart the SSE connection when it changes.
    const onEventRef = useRef(onEvent)
    const onErrorRef = useRef(onError)

    useEffect(() => {
        onEventRef.current = onEvent
        onErrorRef.current = onError
    }, [onEvent, onError])

    useEffect(() => {
        if (!enabled) return

        console.log(`[SSE] Starting connection`)

        // Native EventSource does not support Headers.
        // If the server requires an auth token, you can pass it via query params `?token=${token}`.
        const eventSource = new EventSource(url)

        eventSource.onmessage = event => {
            try {
                const data = JSON.parse(event.data)
                console.log('[SSE] data:', data)

                if (onEventRef.current) {
                    onEventRef.current(data)
                }
            } catch (e) {
                console.error('[SSE] Error parsing JSON:', e)
                if (onErrorRef.current) {
                    onErrorRef.current(new Error('An error occurred'))
                }

                // Close connection because if the server is sending HTML/Garbage,
                // there's no point in keeping it open.
                eventSource.close()
            }
        }

        eventSource.onerror = err => {
            // We do NOT close the connection here to allow the browser to attempt reconnection on its own.
            // We just log the error. The browser will try again in ~3 seconds.
            console.error(
                '[SSE] Connection error (attempting to reconnect...):',
                err,
            )
        }

        // Cleanup: Closes connection only when the component unmounts
        return () => {
            console.log('[SSE] Closing connection')
            eventSource.close()
        }
    }, [url, enabled])
}
