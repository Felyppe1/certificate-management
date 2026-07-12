import { INotificationGateway } from '../interfaces/gateway/inotification-gateway'
import { to, from, subject, buildHtml } from './email-template'

interface AskForAccessInput {
    email: string
}

export class AskForAccessUseCase {
    constructor(
        private notificationEmailGateway: Pick<
            INotificationGateway,
            'sendEmail'
        >,
    ) {}

    async execute(data: AskForAccessInput) {
        await this.notificationEmailGateway.sendEmail(
            to,
            from,
            subject,
            buildHtml(data.email),
        )
    }
}
