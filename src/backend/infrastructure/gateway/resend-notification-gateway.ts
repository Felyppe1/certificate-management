import { Resend } from 'resend'
import { INotificationGateway } from '@/backend/application/interfaces/inotification-gateway'
import { env } from '@/env'

export class ResendNotificationGateway implements INotificationGateway {
    private resend: Resend

    constructor() {
        this.resend = new Resend(env.RESEND_API_KEY)
    }

    async sendEmail(
        to: string,
        from: string,
        subject: string,
        html: string,
    ): Promise<void> {
        await this.resend.emails.send({
            from: `Certifica <${from}>`,
            to,
            subject,
            html,
        })
    }
}
