import { UserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'
import { IUsersRepository } from './interfaces/repository/iusers-repository'

interface GetMeUseCaseInput {
    userId: string
}

export class GetMeUseCase {
    constructor(private usersRepository: Pick<IUsersRepository, 'getById'>) {}

    async execute(input: GetMeUseCaseInput) {
        const user = await this.usersRepository.getById(input.userId)

        if (!user) {
            throw new UserNotFoundError()
        }

        const serializedUser = user.serialize()

        return {
            id: serializedUser.id,
            email: serializedUser.email,
            isEmailVerified: serializedUser.isEmailVerified,
            name: serializedUser.name,
            credits: serializedUser.credits,
            externalAccounts: serializedUser.externalAccounts,
            emailChangeCode: serializedUser.emailChangeCode
                ? {
                      newEmail: serializedUser.emailChangeCode.newEmail,
                      expiresAt: serializedUser.emailChangeCode.expiresAt,
                  }
                : null,
        }
    }
}
