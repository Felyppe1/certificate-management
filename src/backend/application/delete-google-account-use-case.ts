import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { UserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'

interface DeleteAccountUseCaseInput {
    userId: string
}

export class DeleteAccountUseCase {
    constructor(
        private usersRepository: Pick<IUsersRepository, 'getById' | 'delete'>,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'revokeRefreshToken'
        >,
    ) {}

    async execute({ userId }: DeleteAccountUseCaseInput) {
        const user = await this.usersRepository.getById(userId)

        if (!user) {
            throw new UserNotFoundError()
        }

        if (user.hasExternalAccount('GOOGLE')) {
            await this.googleAuthGateway.revokeRefreshToken(
                user.getGoogleRefreshToken()!,
            )
        }

        await this.usersRepository.delete(user.getId())
    }
}
