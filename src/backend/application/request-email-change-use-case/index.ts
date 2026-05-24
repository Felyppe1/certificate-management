import { IUsersRepository } from '../interfaces/repository/iusers-repository'
import { INotificationGateway } from '../interfaces/inotification-gateway'
import { UserNotFoundError } from '../../domain/error/authentication-error/user-not-found-error'
import { EmailUnavailableError } from '../../domain/error/conflict-error/email-unavailable-error'
import { from, subject, buildHtml } from './email-template'

interface Input {
    userId: string
    newEmail: string
}

export class RequestEmailChangeUseCase {
    constructor(
        private usersRepository: Pick<
            IUsersRepository,
            'getById' | 'getByEmail' | 'update'
        >,
        private notificationGateway: Pick<INotificationGateway, 'sendEmail'>,
    ) {}

    async execute({ userId, newEmail }: Input) {
        const user = await this.usersRepository.getById(userId)

        if (!user) {
            throw new UserNotFoundError()
        }

        const existingUserWithEmail =
            await this.usersRepository.getByEmail(newEmail)

        if (existingUserWithEmail && existingUserWithEmail.getId() !== userId) {
            throw new EmailUnavailableError()
        }

        user.changeEmail(newEmail)

        await this.usersRepository.update(user)

        const emailChangeCode = user.getEmailChangeCode()

        if (emailChangeCode) {
            await this.notificationGateway.sendEmail(
                newEmail,
                from,
                subject,
                buildHtml(emailChangeCode),
            )
        }
    }
}
