import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { AuthenticationError } from '../domain/error/authentication-error'

interface Input {
    userId: string
}

export class CancelSystemLoginUseCase {
    constructor(
        private usersRepository: Pick<IUsersRepository, 'getById' | 'update'>,
    ) {}

    async execute({ userId }: Input) {
        const user = await this.usersRepository.getById(userId)

        if (!user) {
            throw new AuthenticationError('user-not-found')
        }

        user.cancelSystemLogin()

        await this.usersRepository.update(user)
    }
}
