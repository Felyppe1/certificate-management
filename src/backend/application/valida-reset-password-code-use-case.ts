import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'

interface Input {
    email: string
    code: string
}

export class ValidateResetPasswordCodeUseCase {
    constructor(
        private usersRepository: Pick<IUsersRepository, 'getByEmail'>,
    ) {}

    async execute({ email, code }: Input) {
        const user = await this.usersRepository.getByEmail(email)

        if (!user) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.USER)
        }

        user.validateResetPasswordCode(code)
    }
}
