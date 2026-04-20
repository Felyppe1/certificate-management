import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { AuthenticationError } from '../domain/error/authentication-error'
import { Provider } from '../domain/external-account'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'

interface Input {
    userId: string
    provider: Provider
}

export class UnlinkExternalAccountUseCase {
    constructor(
        private usersRepository: Pick<IUsersRepository, 'getById' | 'update'>,
    ) {}

    async execute({ userId, provider }: Input) {
        const user = await this.usersRepository.getById(userId)

        if (!user) {
            throw new AuthenticationError('user-not-found')
        }

        if (!user.canRemoveExternalAccount(provider)) {
            throw new ValidationError(VALIDATION_ERROR_TYPE.LAST_LOGIN_METHOD)
        }

        user.removeExternalAccount(provider)

        await this.usersRepository.update(user)
    }
}
