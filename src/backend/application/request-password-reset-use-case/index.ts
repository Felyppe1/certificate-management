import { IUsersRepository } from '../interfaces/repository/iusers-repository'
import { INotificationGateway } from '../interfaces/inotification-gateway'
import { UserNotFoundError } from '../../domain/error/not-found-error/user-not-found-error'
import { from, subject, buildHtml } from './email-template'

interface Input {
    email: string
}

export class RequestPasswordResetUseCase {
    constructor(
        private usersRepository: Pick<
            IUsersRepository,
            'getByEmail' | 'update'
        >,
        private notificationGateway: Pick<INotificationGateway, 'sendEmail'>,
    ) {}

    async execute({ email }: Input) {
        const user = await this.usersRepository.getByEmail(email)

        if (!user) {
            throw new UserNotFoundError()
        }

        user.generateResetPasswordCode()

        await this.usersRepository.update(user)

        await this.notificationGateway.sendEmail(
            email,
            from,
            subject,
            buildHtml(user.getResetPasswordCode()!),
        )
    }
}
