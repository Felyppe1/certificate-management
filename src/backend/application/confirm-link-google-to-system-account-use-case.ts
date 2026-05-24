import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { ISessionsRepository } from './interfaces/repository/isessions-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { Session } from '../domain/session'
import { UserNotFoundError as AuthUserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'
import { UserNotFoundError } from '../domain/error/not-found-error/user-not-found-error'
import { ExternalAccountAlreadyExistsError } from '../domain/error/conflict-error/external-account-already-exists-error'
import { NoGoogleAccountError } from '../domain/error/validation-error/no-google-account-error'

interface ConfirmLinkGoogleToSystemAccountInput {
    userId: string
}

export class ConfirmLinkGoogleToSystemAccountUseCase {
    constructor(
        private usersRepository: Pick<
            IUsersRepository,
            'getById' | 'getByEmail' | 'update' | 'delete'
        >,
        private sessionsRepository: Pick<ISessionsRepository, 'save'>,
        private transactionManager: Pick<ITransactionManager, 'run'>,
    ) {}

    async execute({ userId }: ConfirmLinkGoogleToSystemAccountInput) {
        const googleUser = await this.usersRepository.getById(userId)

        if (!googleUser) {
            throw new AuthUserNotFoundError()
        }

        if (!googleUser.hasExternalAccount('GOOGLE')) {
            throw new NoGoogleAccountError()
        }

        const systemUser = await this.usersRepository.getByEmail(
            googleUser.getGoogleEmail()!,
        )

        if (!systemUser) {
            throw new UserNotFoundError()
        }

        if (systemUser.hasExternalAccount('GOOGLE')) {
            throw new ExternalAccountAlreadyExistsError()
        }

        const googleAccountData = googleUser
            .serialize()
            .externalAccounts.find(a => a.provider === 'GOOGLE')!

        systemUser.addExternalAccountWithSameEmail('GOOGLE', {
            providerUserId: googleAccountData.providerUserId,
            accessToken: googleAccountData.accessToken,
            refreshToken: googleAccountData.refreshToken,
            accessTokenExpiryDateTime:
                googleAccountData.accessTokenExpiryDateTime,
            refreshTokenExpiryDateTime:
                googleAccountData.refreshTokenExpiryDateTime,
        })

        const session = Session.create(systemUser.getId())

        await this.transactionManager.run(async () => {
            await this.usersRepository.delete(googleUser.getId())
            await this.usersRepository.update(systemUser)
            await this.sessionsRepository.save(session)
        })

        return session.getToken()
    }
}
