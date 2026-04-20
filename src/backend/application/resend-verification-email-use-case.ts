import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { INotificationGateway } from './interfaces/inotification-gateway'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    CONFLICT_ERROR_TYPE,
    ConflictError,
} from '../domain/error/conflict-error'
import {
    ForbiddenError,
    FORBIDDEN_ERROR_TYPE,
} from '../domain/error/forbidden-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'

interface Input {
    userId: string
}

export class ResendVerificationEmailUseCase {
    constructor(
        private usersRepository: Pick<IUsersRepository, 'getById' | 'update'>,
        private notificationGateway: Pick<
            INotificationGateway,
            'sendEmailVerification'
        >,
    ) {}

    async execute({ userId }: Input) {
        const user = await this.usersRepository.getById(userId)

        if (!user) {
            throw new AuthenticationError('user-not-found')
        }

        const userEmail = user.getEmail()

        if (!userEmail) {
            throw new ForbiddenError(
                FORBIDDEN_ERROR_TYPE.NO_SYSTEM_EMAIL_CONFIGURED,
            )
        }

        if (user.getIsEmailVerified()) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.EMAIL_ALREADY_VERIFIED,
            )
        }

        user.generateVerificationToken()

        await this.usersRepository.update(user)

        await this.notificationGateway.sendEmailVerification(
            userEmail,
            user.getVerificationToken()!,
        )
    }
}
