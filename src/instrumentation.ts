import type { Logger } from 'pino'

declare global {
    var logger: Logger | undefined
}

export async function register() {
    console.log('Instrumentation started')

    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { getPostgresListener } = await import(
            './backend/infrastructure/listener/pg'
        )

        await getPostgresListener()

        const pino = (await import('pino')).default

        const pinoLoki = (await import('pino-loki')).default

        const transporter = pinoLoki({
            host: process.env.LOKI_URL!,
            interval: 5,
            batching: true,
            labels: { app: 'certificate-management' },
        })

        const logger = pino(transporter)

        globalThis.logger = logger
    }
}
