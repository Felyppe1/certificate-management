import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { UserNotFoundError } from '../domain/error/not-found-error/user-not-found-error'

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
            throw new UserNotFoundError()
        }

        user.validateResetPasswordCode(code)
    }
}
