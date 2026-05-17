import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { AuthenticationError } from '../domain/error/authentication-error'

interface Input {
    userId: string
}

export class CancelEmailChangeUseCase {
    constructor(
        private usersRepository: Pick<IUsersRepository, 'getById' | 'update'>,
    ) {}

    async execute({ userId }: Input) {
        const user = await this.usersRepository.getById(userId)

        if (!user) {
            throw new AuthenticationError('user-not-found')
        }

        user.cancelEmailChange()

        await this.usersRepository.update(user)
    }
}
