import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { UserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'

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
            throw new UserNotFoundError()
        }

        user.cancelSystemLogin()

        await this.usersRepository.update(user)
    }
}
