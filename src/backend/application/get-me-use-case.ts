import { AuthenticationError } from '../domain/error/authentication-error'
import { IUsersRepository } from './interfaces/repository/iusers-repository'

interface GetMeUseCaseInput {
    userId: string
}

export class GetMeUseCase {
    constructor(private usersRepository: Pick<IUsersRepository, 'getById'>) {}

    async execute(input: GetMeUseCaseInput) {
        const user = await this.usersRepository.getById(input.userId)

        if (!user) {
            throw new AuthenticationError('user-not-found')
        }

        return {
            id: user.getId(),
            email: user.getEmail(),
            name: user.getName(),
            credits: user.getCredits(),
            externalAccounts: user.getExternalAccounts().map(account => ({
                provider: account.getProvider(),
                providerUserId: account.getProviderUserId(),
                accessToken: account.getAccessToken(),
                accessTokenExpiryDateTime:
                    account.getAccessTokenExpiryDateTime(),
            })),
        }
    }
}
