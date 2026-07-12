import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { UserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'
import { Provider } from '../domain/external-account'
import { IGoogleAuthGateway } from './interfaces/gateway/igoogle-auth-gateway'

interface Input {
    userId: string
    provider: Provider
}

export class UnlinkExternalAccountUseCase {
    constructor(
        private usersRepository: Pick<IUsersRepository, 'getById' | 'update'>,
        private googleAuthGateway: IGoogleAuthGateway,
    ) {}

    async execute({ userId, provider }: Input) {
        const user = await this.usersRepository.getById(userId)

        if (!user) {
            throw new UserNotFoundError()
        }

        const removedExternalAccount = user.removeExternalAccount(provider)

        if (provider === 'GOOGLE' && removedExternalAccount) {
            await this.googleAuthGateway.revokeRefreshToken(
                removedExternalAccount.refreshToken!,
            )
        }

        await this.usersRepository.update(user)
    }
}
