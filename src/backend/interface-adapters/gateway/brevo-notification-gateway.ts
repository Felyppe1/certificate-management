import { BrevoClient } from '@getbrevo/brevo'
import { INotificationGateway } from '@/backend/application/interfaces/gateway/inotification-gateway'
import { env } from '@/env'

export class BrevoNotificationGateway implements INotificationGateway {
    private client: BrevoClient

    constructor() {
        this.client = new BrevoClient({ apiKey: env.BREVO_API_KEY })
    }

    async sendEmail(
        to: string,
        from: string,
        subject: string,
        html: string,
    ): Promise<void> {
        if (env.IS_E2E) return

        await this.client.transactionalEmails.sendTransacEmail({
            sender: { name: 'Certifica', email: from },
            to: [{ email: to }],
            subject,
            htmlContent: html,
        })
    }
}
