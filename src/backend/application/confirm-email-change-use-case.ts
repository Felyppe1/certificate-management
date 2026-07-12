import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { UserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'
import { EmailUnavailableError } from '../domain/error/conflict-error/email-unavailable-error'

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
            throw new UserNotFoundError()
        }

        const newEmail = user.getEmailRequestedForChange() || ''

        const existingUserWithEmail =
            await this.usersRepository.getByEmail(newEmail)

        if (existingUserWithEmail && existingUserWithEmail.getId() !== userId) {
            throw new EmailUnavailableError()
        }

        user.confirmEmailChange(code)

        await this.usersRepository.update(user)

        return { newEmail: user.getEmail()! }
    }
}
