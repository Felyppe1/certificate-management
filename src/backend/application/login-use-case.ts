import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { ISessionsRepository } from './interfaces/repository/write/isessions-repository'
import { IncorrectCredentialsError } from '../domain/error/authentication-error/incorrect-credentials-error'
import { EmailNotVerifiedError } from '../domain/error/forbidden-error/email-not-verified-error'
import { Session } from '../domain/session'

export class LoginUseCase {
    constructor(
        private usersRepository: Pick<IUsersRepository, 'getByEmail'>,
        private sessionsRepository: Pick<ISessionsRepository, 'save'>,
    ) {}

    async execute(email: string, passwordPlain: string) {
        const user = await this.usersRepository.getByEmail(email)

        if (!user) {
            throw new IncorrectCredentialsError()
        }

        const isPasswordValid = await user.comparePassword(passwordPlain)

        if (!isPasswordValid) {
            throw new IncorrectCredentialsError()
        }

        if (!user.hasVerifiedEmailAccess()) {
            throw new EmailNotVerifiedError()
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
