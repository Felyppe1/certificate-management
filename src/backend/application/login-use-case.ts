import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { ISessionsRepository } from './interfaces/repository/isessions-repository'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    ForbiddenError,
    FORBIDDEN_ERROR_TYPE,
} from '../domain/error/forbidden-error'
import { Session } from '../domain/session'

export class LoginUseCase {
    constructor(
        private usersRepository: Pick<IUsersRepository, 'getByEmail'>,
        private sessionsRepository: Pick<ISessionsRepository, 'save'>,
    ) {}

    async execute(email: string, passwordPlain: string) {
        const user = await this.usersRepository.getByEmail(email)

        if (!user) {
            throw new AuthenticationError('incorrect-credentials')
        }

        const isPasswordValid = await user.comparePassword(passwordPlain)

        if (!isPasswordValid) {
            throw new AuthenticationError('incorrect-credentials')
        }

        if (!user.hasVerifiedEmailAccess()) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.EMAIL_NOT_VERIFIED)
        }

        const session = Session.create(user.getId())

        await this.sessionsRepository.save(session)

        return {
            token: session.getToken(),
            user: {
                id: user.getId(),
                name: user.getName(),
                email: user.getEmail(),
            },
        }
    }
}
