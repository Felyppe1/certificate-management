import { IExternalUserAccountsRepository } from './interfaces/iexternal-user-accounts-repository'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { IUsersRepository } from './interfaces/iusers-repository'
import { AuthenticationError } from '../domain/error/authentication-error'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'

interface DeleteGoogleAccountUseCaseInput {
    // code: string // In case we force the user to login again before deleting the account
    sessionToken: string
}

export class DeleteGoogleAccountUseCase {
    constructor(
        private usersRepository: Pick<IUsersRepository, 'getById' | 'delete'>,
        private externalUserAccountsRepository: Pick<
            IExternalUserAccountsRepository,
            'getById'
        >,
        private sessionsRepository: Pick<ISessionsRepository, 'getById'>,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'revokeRefreshToken'
        >,
    ) {}

    async execute({ sessionToken }: DeleteGoogleAccountUseCaseInput) {
        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new AuthenticationError('session-not-found')
        }

        const user = await this.usersRepository.getById(session.userId)

        if (!user) {
            throw new AuthenticationError('user-not-found')
        }

        const externalAccount =
            await this.externalUserAccountsRepository.getById(user.id, 'GOOGLE')

        if (!externalAccount) {
            throw new AuthenticationError('external-account-not-found')
        }

        await this.googleAuthGateway.revokeRefreshToken(
            externalAccount.refreshToken!,
        )

        await this.usersRepository.delete(user.id)
        // const tokenData = await this.googleAuthGateway.getToken({
        //     code
        // })

        // const hasAllScopes = [
        //     'https://www.googleapis.com/auth/drive.file',
        //     'https://www.googleapis.com/auth/drive.readonly',
        // ].every(scope => tokenData.scopes.includes(scope))

        // if (!hasAllScopes) {
        //     throw new AuthenticationError(
        //         'insufficient-external-account-scopes',
        //     )
        // }

        // const userInfo = await this.googleAuthGateway.getUserInfo({
        //     idToken: tokenData.idToken,
        // })

        // const userExists = await this.usersRepository.getByEmail(userInfo.email)
    }
}
