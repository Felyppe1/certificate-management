declare global {
    interface Window {
        gtag: (
            command: 'config' | 'set' | 'event',
            targetId: string,
            parameters?: { [key: string]: any } | null,
        ) => void
    }
}

export {}
