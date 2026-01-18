import {
    EnqueueGenerateCertificatePDFInput,
    EnqueueSendCertificateEmailsInput,
    IQueue,
} from '@/backend/application/interfaces/cloud/iqueue'
import { CloudTasksClient } from '@google-cloud/tasks'

export class CloudTasksQueue implements IQueue {
    private queue = new CloudTasksClient()

    async enqueueGenerateCertificatePDF(
        data: EnqueueGenerateCertificatePDFInput,
    ): Promise<void> {
        const project = process.env.GCP_PROJECT_ID!
        const location = process.env.GCP_REGION!
        const queue = process.env.CERTIFICATE_GENERATIONS_QUEUE_NAME!
        const suffix = process.env.SUFFIX!

        const parent = this.queue.queuePath(project, location, queue)
        const task = {
            httpRequest: {
                relativeUri: '/generate-pdfs' + suffix,
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
