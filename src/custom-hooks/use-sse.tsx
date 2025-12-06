import { useEffect, useRef } from 'react'

interface UseSSEConfig<T> {
    enabled?: boolean
    onEvent: (data: T) => void
}

export function useSSE(
    url: string,
    { enabled = true, onEvent }: UseSSEConfig<any>,
) {
    const onEventRef = useRef(onEvent)

    onEventRef.current = onEvent

    useEffect(() => {
        if (!enabled) return

        const eventSource = new EventSource(url)

        eventSource.onmessage = event => {
            const data = JSON.parse(event.data)
            console.log('SSE event:', data)
            onEventRef.current(data)
        }

        eventSource.onerror = err => {
            console.error('SSE error:', err)
            eventSource.close()
        }

        return () => {
            console.log('Fechando conexão SSE')
            eventSource.close()
        }
    }, [url, enabled])
}
