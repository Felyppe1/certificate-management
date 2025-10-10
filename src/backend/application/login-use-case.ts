import { IUsersRepository } from './interfaces/iusers-repository'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { UnauthorizedError } from '../domain/error/unauthorized-error'

export class LoginUseCase {
    constructor(
        private usersRepository: IUsersRepository,
        private sessionsRepository: ISessionsRepository,
    ) {}

    async execute(email: string, password: string) {
        const user = await this.usersRepository.getByEmail(email)

        if (!user) {
            throw new UnauthorizedError()
        }

        // TODO: check if ''compared to '' passes
        const isPasswordValid = await bcrypt.compare(
            password,
            user.passwordHash ?? '',
        )

        if (!isPasswordValid) {
            throw new UnauthorizedError()
        }

        const sessionToken = crypto.randomBytes(32).toString('hex')

        await this.sessionsRepository.save({
            userId: user.id,
            token: sessionToken,
        })

        return {
            token: sessionToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
            },
        }
    }
}
