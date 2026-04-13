import { INotificationEmailGateway } from './interfaces/inotification-email-gateway'

interface AskForAccessInput {
    email: string
}

export class AskForAccessUseCase {
    constructor(private notificationEmailGateway: INotificationEmailGateway) {}

    async execute(data: AskForAccessInput) {
        await this.notificationEmailGateway.sendAccessRequest(data.email)
    }
}
