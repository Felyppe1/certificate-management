import { IUsersRepository } from './interfaces/repository/iusers-repository'
import bcrypt from 'bcrypt'
import { ISessionsRepository } from './interfaces/repository/isessions-repository'
import { AuthenticationError } from '../domain/error/authentication-error'
import { Session } from '../domain/session'

export class LoginUseCase {
    constructor(
        private usersRepository: IUsersRepository,
        private sessionsRepository: ISessionsRepository,
    ) {}

    async execute(email: string, password: string) {
        const user = await this.usersRepository.getByEmail(email)

        if (!user) {
            throw new AuthenticationError('incorrect-credentials')
        }

        // TODO: check if ''compared to '' passes
        const isPasswordValid = await bcrypt.compare(
            password,
            user.getPasswordHash() ?? '',
        )

        if (!isPasswordValid) {
            throw new AuthenticationError('incorrect-credentials')
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
