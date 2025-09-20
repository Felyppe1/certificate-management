import { Logger /* , logs */ } from '@opentelemetry/api-logs'
// import {
//     ConsoleLogRecordExporter,
//     LoggerProvider,
//     SimpleLogRecordProcessor,
// } from '@opentelemetry/sdk-logs'
// import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
// import { Resource } from '@opentelemetry/resources'
// import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions'

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

        // TODO: It's either registerOtel or manual setup, not both
        // registerOTel('certificate-management')

        // const resource = new Resource({
        //     [ATTR_SERVICE_NAME]: 'certificate-management',
        // })

        // // const exporter = new ConsoleLogRecordExporter()

        // // Send to loki
        // const exporter = new OTLPLogExporter({
        //     url: process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT,
        // })

        // const loggerProvider = new LoggerProvider({
        //     resource: resource,
        //     // processors: [
        //     //     new SimpleLogRecordProcessor(exporter),
        //     // ]
        // })

        // loggerProvider.addLogRecordProcessor(
        //     new SimpleLogRecordProcessor(new ConsoleLogRecordExporter()),
        // )

        // loggerProvider.addLogRecordProcessor(
        //     new SimpleLogRecordProcessor(exporter),
        // )

        // const logger = loggerProvider.getLogger('certificate-management')

        // logs.setGlobalLoggerProvider(loggerProvider)

        // globalThis.logger = logger
    }
}
