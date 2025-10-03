import { NotFoundError } from '../domain/error/not-found-error'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { ExternalUserAccountsRepository } from './interfaces/external-user-account-repository'
import { SessionsRepository } from './interfaces/sessions-repository'
import { UsersRepository } from './interfaces/users-repository'

interface GetMeUseCaseInput {
    sessionToken: string
}

export class GetMeUseCase {
    constructor(
        private sessionsRepository: SessionsRepository,
        private usersRepository: UsersRepository,
        private externalUserAccountsRepository: ExternalUserAccountsRepository,
    ) {}

    async execute(input: GetMeUseCaseInput) {
        const { sessionToken } = input

        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new UnauthorizedError('Session not found')
        }

        const user = await this.usersRepository.getById(session.userId)

        if (!user) {
            throw new NotFoundError('User not found')
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
            })),
        }
    }
}
