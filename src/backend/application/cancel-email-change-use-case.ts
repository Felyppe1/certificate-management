import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { UserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'

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
            throw new UserNotFoundError()
        }

        user.cancelEmailChange()

        await this.usersRepository.update(user)
    }
}
