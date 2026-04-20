import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { AuthenticationError } from '../domain/error/authentication-error'

interface Input {
    userId: string
    currentPassword: string
    newPassword: string
}

export class UpdateSystemPasswordUseCase {
    constructor(
        private usersRepository: Pick<IUsersRepository, 'getById' | 'update'>,
    ) {}

    async execute({ userId, currentPassword, newPassword }: Input) {
        const user = await this.usersRepository.getById(userId)

        if (!user) {
            throw new AuthenticationError('user-not-found')
        }

        await user.updatePassword(newPassword, currentPassword)

        await this.usersRepository.update(user)
    }
}
