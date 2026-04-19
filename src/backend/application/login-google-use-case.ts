import { ISessionsRepository } from './interfaces/repository/isessions-repository'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    ForbiddenError,
    FORBIDDEN_ERROR_TYPE,
} from '../domain/error/forbidden-error'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { User } from '../domain/user'
import { Session } from '../domain/session'

interface LoginGoogleUseCaseInput {
    code: string
    reAuthenticate: boolean
    userId?: string
}

export class LoginGoogleUseCase {
    constructor(
        private usersRepository: Pick<
            IUsersRepository,
            'save' | 'update' | 'getByEmail' | 'getById'
        >,
        private sessionsRepository: Pick<ISessionsRepository, 'save'>,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'getToken' | 'getUserInfo'
        >,
        private transactionManager: Pick<ITransactionManager, 'run'>,
    ) {}

    async execute({ code, reAuthenticate, userId }: LoginGoogleUseCaseInput) {
        let authenticatedUser: User | null = null

        if (userId) {
            authenticatedUser = await this.usersRepository.getById(userId)
            if (!authenticatedUser) {
                throw new AuthenticationError('user-not-found')
            }
        }

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

        let user: User
        let isNewUser = false

        if (authenticatedUser) {
            if (userInfo.email !== authenticatedUser.getEmail()) {
                throw new ForbiddenError(
                    FORBIDDEN_ERROR_TYPE.GOOGLE_ACCOUNT_EMAIL_MISMATCH,
                )
            }

            user = authenticatedUser
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
        } else {
            const userExists = await this.usersRepository.getByEmail(
                userInfo.email,
            )

            if (!userExists) {
                isNewUser = true
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
                    accessTokenExpiryDateTime:
                        tokenData.accessTokenExpiryDateTime,
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
        }

        const session = Session.create(user.getId())

        await this.transactionManager.run(async () => {
            if (isNewUser) {
                await this.usersRepository.save(user)
            } else {
                await this.usersRepository.update(user)
            }

            await this.sessionsRepository.save(session)
        })

        return session.getToken()
    }
}
