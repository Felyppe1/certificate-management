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
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'

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
            throw new AuthenticationError('user-not-found')
        }

        if (!systemUser.hasSystemLogin()) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.SYSTEM_LOGIN_NOT_ENABLED,
            )
        }

        const googleUser = await this.usersRepository.getByExternalAccountEmail(
            'GOOGLE',
            systemUser.getEmail()!,
        )

        if (!googleUser) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.EXTERNAL_ACCOUNT)
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
