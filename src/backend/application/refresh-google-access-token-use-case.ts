import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'

interface RefreshGoogleAccessTokenUseCaseInput {
    userId: string
}

export class RefreshGoogleAccessTokenUseCase {
    constructor(
        private usersRepository: Pick<IUsersRepository, 'getById' | 'update'>,
        private googleAuthGateway: IGoogleAuthGateway,
    ) {}

    async execute({ userId }: RefreshGoogleAccessTokenUseCaseInput) {
        const user = await this.usersRepository.getById(userId)

        const externalAccount = user?.getExternalAccount('GOOGLE')

        if (!externalAccount) {
            throw new ForbiddenError(
                FORBIDDEN_ERROR_TYPE.GOOGLE_ACCOUNT_NOT_FOUND,
            )
        }

        const newToken = await this.googleAuthGateway.checkOrGetNewAccessToken({
            accessToken: externalAccount.getAccessToken(),
            refreshToken: externalAccount.getRefreshToken()!,
            accessTokenExpiryDateTime:
                externalAccount.getAccessTokenExpiryDateTime()!,
        })

        if (newToken) {
            user!.updateExternalAccount('GOOGLE', {
                accessToken: newToken.newAccessToken,
                accessTokenExpiryDateTime:
                    newToken.newAccessTokenExpiryDateTime,
            })

            await this.usersRepository.update(user!)
        }

        return externalAccount.getAccessToken()
    }
}
