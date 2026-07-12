import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { UserNotFoundError } from '../domain/error/not-found-error/user-not-found-error'

interface Input {
    email: string
    code: string
    newPassword: string
}

export class ResetPasswordUseCase {
    constructor(
        private usersRepository: Pick<
            IUsersRepository,
            'getByEmail' | 'update'
        >,
    ) {}

    async execute({ email, code, newPassword }: Input) {
        const user = await this.usersRepository.getByEmail(email)

        if (!user) {
            throw new UserNotFoundError()
        }

        await user.resetPassword(code, newPassword)

        await this.usersRepository.update(user)
    }
}
