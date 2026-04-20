import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { INotificationGateway } from './interfaces/inotification-gateway'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    CONFLICT_ERROR_TYPE,
    ConflictError,
} from '../domain/error/conflict-error'

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
        private notificationGateway: Pick<
            INotificationGateway,
            'sendEmailVerification'
        >,
    ) {}

    async execute({ userId, email, passwordPlain }: Input) {
        const user = await this.usersRepository.getById(userId)

        if (!user) {
            throw new AuthenticationError('user-not-found')
        }

        const existingUserWithEmail =
            await this.usersRepository.getByEmail(email)

        if (existingUserWithEmail && existingUserWithEmail.getId() !== userId) {
            throw new ConflictError(CONFLICT_ERROR_TYPE.EMAIL_UNAVAILABLE)
        }

        await user.setSystemLogin(email, passwordPlain)

        await this.usersRepository.update(user)

        await this.notificationGateway.sendEmailVerification(
            email,
            user.getVerificationToken()!,
        )
    }
}
