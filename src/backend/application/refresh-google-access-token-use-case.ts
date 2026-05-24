import { GoogleAccountNotFoundError } from '../domain/error/forbidden-error/google-account-not-found-error'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'

interface RefreshGoogleAccessTokenUseCaseInput {
    userId: string
}

export class RefreshGoogleAccessTokenUseCase {
    constructor(
        private usersRepository: Pick<IUsersRepository, 'getById' | 'update'>,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        >,
    ) {}

    async execute({ userId }: RefreshGoogleAccessTokenUseCaseInput) {
        const user = await this.usersRepository.getById(userId)

        if (!user?.hasExternalAccount('GOOGLE')) {
            throw new GoogleAccountNotFoundError()
        }

        const newToken = await this.googleAuthGateway.checkOrGetNewAccessToken({
            accessToken: user.getGoogleAccessToken()!,
            refreshToken: user.getGoogleRefreshToken()!,
            accessTokenExpiryDateTime:
                user.getGoogleAccessTokenExpiryDateTime()!,
        })

        if (newToken) {
            user.updateExternalAccountTokens('GOOGLE', {
                accessToken: newToken.newAccessToken,
                accessTokenExpiryDateTime:
                    newToken.newAccessTokenExpiryDateTime,
            })

            await this.usersRepository.update(user)
        }

        return user.getGoogleAccessToken()!
    }
}
