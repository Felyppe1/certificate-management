import {
    EnqueueGenerateCertificatePDFInput,
    EnqueueSendCertificateEmailsInput,
    IQueue,
} from '@/backend/application/interfaces/cloud/iqueue'
import { CloudTasksClient } from '@google-cloud/tasks'

export class CloudTasksQueue implements IQueue {
    private queue: CloudTasksClient

    constructor() {
        this.queue = new CloudTasksClient()
    }

    async enqueueGenerateCertificatePDF(
        data: EnqueueGenerateCertificatePDFInput,
    ): Promise<void> {
        const project = process.env.GCP_PROJECT_ID!
        const location = process.env.GCP_REGION!
        const queue = process.env.CERTIFICATE_GENERATIONS_QUEUE_NAME!

        const parent = this.queue.queuePath(project, location, queue)
        const task = {
            httpRequest: {
                relativeUri: '/',
                headers: {
                    'Content-Type': 'application/json',
                },
                httpMethod: 'POST' as const,
                body: Buffer.from(JSON.stringify(data)).toString('base64'),
            },
        }

        await this.queue.createTask({ parent, task })
    }

    async enqueueSendCertificateEmails(
        data: EnqueueSendCertificateEmailsInput,
    ): Promise<void> {
        throw new Error('Method not implemented.')
    }
}
