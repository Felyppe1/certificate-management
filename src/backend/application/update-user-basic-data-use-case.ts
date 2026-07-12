import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { UserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'

interface Input {
    userId: string
    name: string
}

export class UpdateUserBasicDataUseCase {
    constructor(
        private usersRepository: Pick<IUsersRepository, 'getById' | 'update'>,
    ) {}

    async execute({ userId, name }: Input) {
        const user = await this.usersRepository.getById(userId)
        if (!user) throw new UserNotFoundError()
        user.updateName(name)
        await this.usersRepository.update(user)
    }
}
