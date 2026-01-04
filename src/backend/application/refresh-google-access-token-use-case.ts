import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import { IExternalUserAccountsRepository } from './interfaces/repository/iexternal-user-accounts-repository'
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
            throw new ForbiddenError(
                FORBIDDEN_ERROR_TYPE.GOOGLE_ACCOUNT_NOT_FOUND,
            )
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
