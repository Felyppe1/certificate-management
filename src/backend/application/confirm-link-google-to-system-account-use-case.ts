import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { ISessionsRepository } from './interfaces/repository/isessions-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { Session } from '../domain/session'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    NotFoundError,
    NOT_FOUND_ERROR_TYPE,
} from '../domain/error/not-found-error'
import {
    ConflictError,
    CONFLICT_ERROR_TYPE,
} from '../domain/error/conflict-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'

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
            throw new AuthenticationError('user-not-found')
        }

        if (!googleUser.hasGoogleAccount()) {
            throw new ValidationError(VALIDATION_ERROR_TYPE.NO_GOOGLE_ACCOUNT)
        }

        const systemUser = await this.usersRepository.getByEmail(
            googleUser.getGoogleEmail()!,
        )

        if (!systemUser) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.USER)
        }

        if (systemUser.hasGoogleAccount()) {
            throw new ConflictError(
                CONFLICT_ERROR_TYPE.EXTERNAL_ACCOUNT_ALREADY_EXISTS,
            )
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
