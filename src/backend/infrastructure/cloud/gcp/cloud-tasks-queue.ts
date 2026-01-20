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
        const queue = `generate-pdfs${process.env.SUFFIX || ''}`
        // const url = this.getCloudFunctionUrl('generate-pdfs')

        const parent = this.queue.queuePath(project, location, queue)
        const task = {
            httpRequest: {
                // url,
                // headers: {
                //     'Content-Type': 'application/json',
                // },
                // httpMethod: 'POST' as const,
                body: Buffer.from(JSON.stringify(data)).toString('base64'),
            },
        }

        await this.queue.createTask({ parent, task })
    }

    async enqueueSendCertificateEmails(
        data: EnqueueSendCertificateEmailsInput,
    ): Promise<void> {
        const project = process.env.GCP_PROJECT_ID!
        const location = process.env.GCP_REGION!
        const queue = `send-certificate-emails${process.env.SUFFIX || ''}`
        // const url = this.getCloudFunctionUrl('send-certificate-emails', {
        //     entryPoint: 'main',
        // })

        const parent = this.queue.queuePath(project, location, queue)
        const task = {
            httpRequest: {
                // url,
                // headers: {
                //     'Content-Type': 'application/json',
                // },
                // httpMethod: 'POST' as const,
                body: Buffer.from(JSON.stringify(data)).toString('base64'),
            },
        }

        await this.queue.createTask({ parent, task })
    }

    private getCloudFunctionUrl(
        functionName: string,
        options?: { entryPoint?: string },
    ): string {
        const projectNumber = process.env.GCP_PROJECT_NUMBER
        const region = process.env.GCP_REGION
        const suffix = process.env.SUFFIX || ''

        if (!projectNumber || !region) {
            throw new Error('GCP_PROJECT_NUMBER or GCP_REGION not set')
        }

        const functionFullName = `${functionName}${suffix}`

        let url = `https://${functionFullName}-${projectNumber}.${region}.run.app`

        if (options?.entryPoint) {
            url += `/${options.entryPoint}`
        }

        return url
    }
}
