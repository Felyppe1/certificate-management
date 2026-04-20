import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    NotFoundError,
    NOT_FOUND_ERROR_TYPE,
} from '../domain/error/not-found-error'
import { Session } from '../domain/session'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { ISessionsRepository } from './interfaces/repository/isessions-repository'

interface Input {
    token: string
}

export class VerifyEmailUseCase {
    constructor(
        private usersRepository: Pick<
            IUsersRepository,
            'getByVerificationToken' | 'update'
        >,
        private sessionsRepository: Pick<ISessionsRepository, 'save'>,
        private transactionManager: Pick<ITransactionManager, 'run'>,
    ) {}

    async execute({ token }: Input) {
        const user = await this.usersRepository.getByVerificationToken(token)

        if (!user) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.VERIFICATION_TOKEN)
        }

        await user.verifyEmail(token)
        const session = Session.create(user.getId())

        this.transactionManager.run(async () => {
            await this.usersRepository.update(user)
            await this.sessionsRepository.save(session)
        })

        return {
            sessionToken: session.getToken(),
        }
    }
}
