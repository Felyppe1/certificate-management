import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'

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
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.USER)
        }

        await user.resetPassword(code, newPassword)

        await this.usersRepository.update(user)
    }
}
