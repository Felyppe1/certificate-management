import { IUsersRepository } from '../interfaces/repository/write/iusers-repository'
import { INotificationGateway } from '../interfaces/gateway/inotification-gateway'
import { UserNotFoundError } from '../../domain/error/authentication-error/user-not-found-error'
import { EmailUnavailableError } from '../../domain/error/conflict-error/email-unavailable-error'
import { from, subject, buildHtml } from './email-template'

interface Input {
    userId: string
    email: string
    passwordPlain: string
}

export class SetSystemLoginUseCase {
    constructor(
        private usersRepository: Pick<
            IUsersRepository,
            'getById' | 'getByEmail' | 'update'
        >,
        private notificationGateway: Pick<INotificationGateway, 'sendEmail'>,
    ) {}

    async execute({ userId, email, passwordPlain }: Input) {
        const user = await this.usersRepository.getById(userId)

        if (!user) {
            throw new UserNotFoundError()
        }

        const existingUserWithEmail =
            await this.usersRepository.getByEmail(email)

        if (existingUserWithEmail && existingUserWithEmail.getId() !== userId) {
            throw new EmailUnavailableError()
        }

        await user.setSystemLogin(email, passwordPlain)

        await this.usersRepository.update(user)

        const emailVerificationCode = user.getEmailVerificationCode()
        if (emailVerificationCode) {
            await this.notificationGateway.sendEmail(
                email,
                from,
                subject,
                buildHtml(emailVerificationCode),
            )
        }
    }
}
