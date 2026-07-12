import { IUsersRepository } from '../interfaces/repository/write/iusers-repository'
import { INotificationGateway } from '../interfaces/gateway/inotification-gateway'
import { UserNotFoundError } from '../../domain/error/authentication-error/user-not-found-error'
import { SystemLoginNotEnabledError } from '../../domain/error/validation-error/system-login-not-enabled-error'
import { EmailAlreadyVerifiedError } from '../../domain/error/validation-error/email-already-verified-error'
import { from, subject, buildHtml } from './email-template'

interface Input {
    email: string
}

export class ResendVerificationEmailUseCase {
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

        if (!user.hasSystemLogin()) {
            throw new SystemLoginNotEnabledError()
        }

        if (user.getIsEmailVerified()) {
            throw new EmailAlreadyVerifiedError()
        }

        user.generateEmailVerificationCode()

        await this.usersRepository.update(user)

        await this.notificationGateway.sendEmail(
            email,
            from,
            subject,
            buildHtml(user.getEmailVerificationCode()!),
        )
    }
}
