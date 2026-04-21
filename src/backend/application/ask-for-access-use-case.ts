import { INotificationGateway } from './interfaces/inotification-gateway'

interface AskForAccessInput {
    email: string
}

export class AskForAccessUseCase {
    constructor(
        private notificationEmailGateway: Pick<
            INotificationGateway,
            'sendAccessRequest'
        >,
    ) {}

    async execute(data: AskForAccessInput) {
        await this.notificationEmailGateway.sendAccessRequest(data.email)
    }
}
