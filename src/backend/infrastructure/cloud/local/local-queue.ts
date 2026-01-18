import {
    EnqueueGenerateCertificatePDFInput,
    EnqueueSendCertificateEmailsInput,
    IQueue,
} from '@/backend/application/interfaces/cloud/iqueue'

export class LocalQueue implements IQueue {
    async enqueueGenerateCertificatePDF(
        data: EnqueueGenerateCertificatePDFInput,
    ): Promise<void> {
        const generatePdfsUrl = 'http://localhost:8080'

        const dataStr = JSON.stringify(data)
        const base64Data = Buffer.from(dataStr).toString('base64')

        const pubsubEnvelope = {
            message: {
                data: base64Data,
            },
        }

        const response = await fetch(generatePdfsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(pubsubEnvelope),
        })

        if (!response.ok) {
            throw new Error(
                `Failed to enqueue generate certificate PDF: ${response.statusText}`,
            )
        }
    }

    async enqueueSendCertificateEmails(
        data: EnqueueSendCertificateEmailsInput,
    ): Promise<void> {
        throw new Error('Method not implemented.')
    }
}
