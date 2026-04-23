import { IUsersRepository } from './interfaces/repository/iusers-repository'
import {
    NotFoundError,
    NOT_FOUND_ERROR_TYPE,
} from '../domain/error/not-found-error'
import { Session } from '../domain/session'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { ISessionsRepository } from './interfaces/repository/isessions-repository'

interface Input {
    email: string
    code: string
}

export class VerifyEmailUseCase {
    constructor(
        private usersRepository: Pick<
            IUsersRepository,
            'getByEmail' | 'update'
        >,
        private sessionsRepository: Pick<ISessionsRepository, 'save'>,
        private transactionManager: Pick<ITransactionManager, 'run'>,
    ) {}

    async execute({ email, code }: Input) {
        console.log('email', email)
        const user = await this.usersRepository.getByEmail(email)

        if (!user) {
            throw new NotFoundError(
                NOT_FOUND_ERROR_TYPE.EMAIL_VERIFICATION_CODE,
            )
        }

        await user.verifyEmail(code)
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
