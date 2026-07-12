import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { UserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'

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
            throw new UserNotFoundError()
        }

        await user.updatePassword(newPassword, currentPassword)

        await this.usersRepository.update(user)
    }
}
