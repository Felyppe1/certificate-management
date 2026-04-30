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
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        >,
    ) {}

    async execute({ userId }: RefreshGoogleAccessTokenUseCaseInput) {
        const user = await this.usersRepository.getById(userId)

        if (!user?.hasExternalAccount('GOOGLE')) {
            throw new ForbiddenError(
                FORBIDDEN_ERROR_TYPE.GOOGLE_ACCOUNT_NOT_FOUND,
            )
        }

        const newToken = await this.googleAuthGateway.checkOrGetNewAccessToken({
            accessToken: user.getGoogleAccessToken()!,
            refreshToken: user.getGoogleRefreshToken()!,
            accessTokenExpiryDateTime:
                user.getGoogleAccessTokenExpiryDateTime()!,
        })

        if (newToken) {
            user.updateExternalAccount('GOOGLE', {
                accessToken: newToken.newAccessToken,
                accessTokenExpiryDateTime:
                    newToken.newAccessTokenExpiryDateTime,
            })

            await this.usersRepository.update(user)
        }

        return user.getGoogleAccessToken()!
    }
}
