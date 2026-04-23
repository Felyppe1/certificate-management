import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { INotificationGateway } from './interfaces/inotification-gateway'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    ForbiddenError,
    FORBIDDEN_ERROR_TYPE,
} from '../domain/error/forbidden-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'

interface Input {
    email: string
}

export class ResendVerificationEmailUseCase {
    constructor(
        private usersRepository: Pick<
            IUsersRepository,
            'getByEmail' | 'update'
        >,
        private notificationGateway: Pick<
            INotificationGateway,
            'sendEmailVerification'
        >,
    ) {}

    async execute({ email }: Input) {
        const user = await this.usersRepository.getByEmail(email)

        if (!user) {
            throw new AuthenticationError('user-not-found')
        }

        if (!user.hasSystemLogin()) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.SYSTEM_LOGIN_NOT_ENABLED,
            )
        }

        if (user.getIsEmailVerified()) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.EMAIL_ALREADY_VERIFIED,
            )
        }

        user.generateEmailVerificationCode()

        await this.usersRepository.update(user)

        await this.notificationGateway.sendEmailVerification(
            email,
            user.getEmailVerificationCode()!,
        )
    }
}
