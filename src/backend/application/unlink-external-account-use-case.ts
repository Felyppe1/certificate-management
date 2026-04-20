import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { AuthenticationError } from '../domain/error/authentication-error'
import { Provider } from '../domain/external-account'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'

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
            throw new AuthenticationError('user-not-found')
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
