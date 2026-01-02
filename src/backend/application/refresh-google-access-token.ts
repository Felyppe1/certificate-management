import { AuthenticationError } from '../domain/error/authentication-error'
import { IExternalUserAccountsRepository } from './interfaces/iexternal-user-accounts-repository'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'

interface RefreshGoogleAccessTokenUseCaseInput {
    userId: string
}

export class RefreshGoogleAccessTokenUseCase {
    constructor(
        private externalUserAccountsRepository: IExternalUserAccountsRepository,
        private googleAuthGateway: IGoogleAuthGateway,
    ) {}

    async execute({ userId }: RefreshGoogleAccessTokenUseCaseInput) {
        const externalAccount =
            await this.externalUserAccountsRepository.getById(userId, 'GOOGLE')

        if (!externalAccount) {
            throw new AuthenticationError('external-account-not-found')
        }

        const newToken = await this.googleAuthGateway.checkOrGetNewAccessToken({
            accessToken: externalAccount.accessToken,
            refreshToken: externalAccount.refreshToken!,
            accessTokenExpiryDateTime:
                externalAccount.accessTokenExpiryDateTime!,
        })

        if (newToken) {
            const { newAccessToken, newAccessTokenExpiryDateTime } = newToken
            externalAccount.accessToken = newAccessToken
            externalAccount.accessTokenExpiryDateTime =
                newAccessTokenExpiryDateTime

            await this.externalUserAccountsRepository.update(externalAccount)
        }

        return externalAccount.accessToken
    }
}
