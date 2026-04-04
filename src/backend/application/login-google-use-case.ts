import { ISessionsRepository } from './interfaces/repository/isessions-repository'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { AuthenticationError } from '../domain/error/authentication-error'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { User } from '../domain/user'
import { Session } from '../domain/session'

interface LoginGoogleUseCaseInput {
    code: string
    reAuthenticate: boolean
}

export class LoginGoogleUseCase {
    constructor(
        private usersRepository: Pick<
            IUsersRepository,
            'save' | 'update' | 'getByEmail'
        >,
        private sessionsRepository: Pick<ISessionsRepository, 'save'>,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'getToken' | 'getUserInfo'
        >,
        private transactionManager: ITransactionManager,
    ) {}

    async execute({ code, reAuthenticate }: LoginGoogleUseCaseInput) {
        const tokenData = await this.googleAuthGateway.getToken({
            code,
            reAuthenticate,
        })

        const hasAllScopes = [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive.readonly',
        ].every(scope => tokenData.scopes.includes(scope))

        if (!hasAllScopes) {
            throw new AuthenticationError(
                'insufficient-external-account-scopes',
            )
        }

        const userInfo = await this.googleAuthGateway.getUserInfo({
            idToken: tokenData.idToken,
        })

        const userExists = await this.usersRepository.getByEmail(userInfo.email)

        let user: User

        if (!userExists) {
            user = User.create({
                email: userInfo.email,
                name: userInfo.name,
                passwordHash: null,
            })
            user.addExternalAccount({
                provider: 'GOOGLE',
                providerUserId: userInfo.providerUserId,
                accessToken: tokenData.accessToken,
                refreshToken: tokenData.refreshToken,
                accessTokenExpiryDateTime: tokenData.accessTokenExpiryDateTime,
                refreshTokenExpiryDateTime: null, // Not necessary because Google refresh tokens don't expire in Published mode
            })
        } else {
            user = userExists
            const externalAccount = user.getExternalAccount('GOOGLE')
            if (!externalAccount) {
                user.addExternalAccount({
                    provider: 'GOOGLE',
                    providerUserId: userInfo.providerUserId,
                    accessToken: tokenData.accessToken,
                    refreshToken: tokenData.refreshToken,
                    accessTokenExpiryDateTime:
                        tokenData.accessTokenExpiryDateTime,
                    refreshTokenExpiryDateTime: null,
                })
            } else {
                user.updateExternalAccount('GOOGLE', {
                    accessToken: tokenData.accessToken,
                    accessTokenExpiryDateTime:
                        tokenData.accessTokenExpiryDateTime,
                    refreshToken:
                        tokenData.refreshToken ??
                        externalAccount.getRefreshToken(),
                })
            }
        }

        const session = Session.create(user.getId())

        await this.transactionManager.run(async () => {
            if (!userExists) {
                await this.usersRepository.save(user)
            } else {
                await this.usersRepository.update(user)
            }

            await this.sessionsRepository.save(session)
        })

        return session.getToken()
    }
}
