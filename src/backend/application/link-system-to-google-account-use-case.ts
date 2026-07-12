import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { ISessionsRepository } from './interfaces/repository/write/isessions-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { Session } from '../domain/session'
import { UserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'
import { ExternalAccountNotFoundError } from '../domain/error/not-found-error/external-account-not-found-error'
import { SystemLoginNotEnabledError } from '../domain/error/validation-error/system-login-not-enabled-error'

interface LinkSystemToGoogleAccountUseCaseInput {
    currentUserId: string
}

export class LinkSystemToGoogleAccountUseCase {
    constructor(
        private usersRepository: Pick<
            IUsersRepository,
            'getById' | 'getByExternalAccountEmail' | 'update' | 'delete'
        >,
        private sessionsRepository: Pick<ISessionsRepository, 'save'>,
        private transactionManager: Pick<ITransactionManager, 'run'>,
    ) {}

    async execute({ currentUserId }: LinkSystemToGoogleAccountUseCaseInput) {
        const systemUser = await this.usersRepository.getById(currentUserId)

        if (!systemUser) {
            throw new UserNotFoundError()
        }

        if (!systemUser.hasSystemLogin()) {
            throw new SystemLoginNotEnabledError()
        }

        const googleUser = await this.usersRepository.getByExternalAccountEmail(
            'GOOGLE',
            systemUser.getEmail()!,
        )

        if (!googleUser) {
            throw new ExternalAccountNotFoundError()
        }

        googleUser.linkSystemAccountWithSameEmail(
            'GOOGLE',
            systemUser.getPasswordHash()!,
        )

        const session = Session.create(googleUser.getId())

        await this.transactionManager.run(async () => {
            await this.usersRepository.delete(systemUser.getId())
            await this.usersRepository.update(googleUser)
            await this.sessionsRepository.save(session)
        })

        return session.getToken()
    }
}
