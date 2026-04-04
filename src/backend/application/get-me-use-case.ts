import { AuthenticationError } from '../domain/error/authentication-error'
import { IExternalUserAccountsRepository } from './interfaces/repository/iexternal-user-accounts-repository'
import { IUsersRepository } from './interfaces/repository/iusers-repository'

interface GetMeUseCaseInput {
    userId: string
}

export class GetMeUseCase {
    constructor(
        private usersRepository: IUsersRepository,
        private externalUserAccountsRepository: IExternalUserAccountsRepository,
    ) {}

    async execute(input: GetMeUseCaseInput) {
        const user = await this.usersRepository.getById(input.userId)

        if (!user) {
            throw new AuthenticationError('user-not-found')
        }

        const externalAccounts =
            await this.externalUserAccountsRepository.getManyByUserId(
                user.getId(),
            )

        return {
            id: user.getId(),
            email: user.getEmail(),
            name: user.getName(),
            credits: user.getCredits(),
            externalAccounts: externalAccounts.map(account => ({
                provider: account.provider,
                providerUserId: account.providerUserId,
                accessToken: account.accessToken,
                accessTokenExpiryDateTime: account.accessTokenExpiryDateTime,
            })),
        }
    }
}
