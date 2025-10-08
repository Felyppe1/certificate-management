import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { ExternalUserAccountsRepository } from './interfaces/external-user-account-repository'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { SessionsRepository } from './interfaces/sessions-repository'

interface RefreshGoogleAccessTokenUseCaseInput {
    sessionToken: string
}

export class RefreshGoogleAccessTokenUseCase {
    constructor(
        private sessionsRepository: SessionsRepository,
        private externalUserAccountsRepository: ExternalUserAccountsRepository,
        private googleAuthGateway: IGoogleAuthGateway,
    ) {}

    async execute({ sessionToken }: RefreshGoogleAccessTokenUseCaseInput) {
        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new UnauthorizedError('Session not found')
        }

        const externalAccount =
            await this.externalUserAccountsRepository.getById(
                session.userId,
                'GOOGLE',
            )

        if (!externalAccount) {
            throw new UnauthorizedError('External account not found')
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
