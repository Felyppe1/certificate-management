import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    NotFoundError,
    NOT_FOUND_ERROR_TYPE,
} from '../domain/error/not-found-error'

interface Input {
    token: string
}

export class VerifyEmailUseCase {
    constructor(
        private usersRepository: Pick<
            IUsersRepository,
            'getByVerificationToken' | 'update'
        >,
    ) {}

    async execute({ token }: Input) {
        const user = await this.usersRepository.getByVerificationToken(token)

        if (!user) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.VERIFICATION_TOKEN)
        }

        await user.verifyEmail(token)

        await this.usersRepository.update(user)
    }
}
