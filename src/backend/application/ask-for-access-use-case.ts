import { INotificationEmailGateway } from './interfaces/inotification-email-gateway'

interface AskForAccessInput {
    email: string
}

export class AskForAccessUseCase {
    constructor(
        private notificationEmailGateway: Pick<
            INotificationEmailGateway,
            'sendAccessRequest'
        >,
    ) {}

    async execute(data: AskForAccessInput) {
        await this.notificationEmailGateway.sendAccessRequest(data.email)
    }
}
