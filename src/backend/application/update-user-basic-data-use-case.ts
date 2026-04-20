import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { AuthenticationError } from '../domain/error/authentication-error'

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
        if (!user) throw new AuthenticationError('user-not-found')
        user.updateName(name)
        await this.usersRepository.update(user)
    }
}
