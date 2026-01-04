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
            await this.externalUserAccountsRepository.getManyByUserId(user.id)

        return {
            id: user.id,
            email: user.email,
            name: user.name,
            externalAccounts: externalAccounts.map(account => ({
                provider: account.provider,
                providerUserId: account.providerUserId,
                accessToken: account.accessToken,
                accessTokenExpiryDateTime: account.accessTokenExpiryDateTime,
            })),
        }
    }
}
