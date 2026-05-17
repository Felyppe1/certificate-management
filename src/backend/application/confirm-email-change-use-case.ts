import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    CONFLICT_ERROR_TYPE,
    ConflictError,
} from '../domain/error/conflict-error'

interface Input {
    userId: string
    code: string
}

export class ConfirmEmailChangeUseCase {
    constructor(
        private usersRepository: Pick<
            IUsersRepository,
            'getById' | 'getByEmail' | 'update'
        >,
    ) {}

    async execute({ userId, code }: Input) {
        const user = await this.usersRepository.getById(userId)

        if (!user) {
            throw new AuthenticationError('user-not-found')
        }

        const newEmail = user.getEmailRequestedForChange() || ''

        const existingUserWithEmail =
            await this.usersRepository.getByEmail(newEmail)

        if (existingUserWithEmail && existingUserWithEmail.getId() !== userId) {
            throw new ConflictError(CONFLICT_ERROR_TYPE.EMAIL_UNAVAILABLE)
        }

        user.confirmEmailChange(code)

        await this.usersRepository.update(user)

        return { newEmail: user.getEmail()! }
    }
}
