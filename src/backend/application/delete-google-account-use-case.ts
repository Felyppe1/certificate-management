import { IExternalUserAccountsRepository } from './interfaces/iexternal-user-accounts-repository'
import { IUsersRepository } from './interfaces/iusers-repository'
import { AuthenticationError } from '../domain/error/authentication-error'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'

interface DeleteAccountUseCaseInput {
    userId: string
}

export class DeleteAccountUseCase {
    constructor(
        private usersRepository: Pick<IUsersRepository, 'getById' | 'delete'>,
        private externalUserAccountsRepository: Pick<
            IExternalUserAccountsRepository,
            'getById'
        >,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'revokeRefreshToken'
        >,
    ) {}

    async execute({ userId }: DeleteAccountUseCaseInput) {
        const user = await this.usersRepository.getById(userId)

        if (!user) {
            throw new AuthenticationError('user-not-found')
        }

        const externalAccount =
            await this.externalUserAccountsRepository.getById(user.id, 'GOOGLE')

        if (externalAccount) {
            await this.googleAuthGateway.revokeRefreshToken(
                externalAccount.refreshToken!,
            )
        }

        await this.usersRepository.delete(user.id)
    }
}
