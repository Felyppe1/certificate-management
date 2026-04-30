import { ISessionsRepository } from './interfaces/repository/isessions-repository'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    ConflictError,
    CONFLICT_ERROR_TYPE,
} from '../domain/error/conflict-error'
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
            | 'save'
            | 'update'
            | 'getByEmail'
            | 'getById'
            | 'getByExternalAccount'
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
        let suggestLinkingEmail: string | null = null

        if (authenticatedUser) {
            // Re-auth: linking Google to an already authenticated user
            const existingOwner =
                await this.usersRepository.getByExternalAccount(
                    'GOOGLE',
                    userInfo.providerUserId,
                )

            if (
                existingOwner &&
                existingOwner.getId() !== authenticatedUser.getId()
            ) {
                throw new ConflictError(
                    CONFLICT_ERROR_TYPE.EXTERNAL_ACCOUNT_ALREADY_EXISTS,
                )
            }

            user = authenticatedUser
            if (!user.hasExternalAccount('GOOGLE')) {
                user.addExternalAccount({
                    provider: 'GOOGLE',
                    providerUserId: userInfo.providerUserId,
                    email: userInfo.email,
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
                        tokenData.refreshToken ?? user.getGoogleRefreshToken(),
                })
            }
        } else {
            // Login flow: look up by (provider, providerUserId) — the stable identifier
            const existingUser =
                await this.usersRepository.getByExternalAccount(
                    'GOOGLE',
                    userInfo.providerUserId,
                )

            if (existingUser) {
                user = existingUser
                user.updateExternalAccount('GOOGLE', {
                    accessToken: tokenData.accessToken,
                    accessTokenExpiryDateTime:
                        tokenData.accessTokenExpiryDateTime,
                    refreshToken:
                        tokenData.refreshToken ?? user.getGoogleRefreshToken(),
                })
            } else {
                const systemUser = await this.usersRepository.getByEmail(
                    userInfo.email,
                )
                if (systemUser && !systemUser.hasExternalAccount('GOOGLE')) {
                    suggestLinkingEmail = userInfo.email
                }

                isNewUser = true
                user = await User.create({
                    email: null,
                    name: userInfo.name,
                    passwordHash: null,
                })

                user.addExternalAccount({
                    provider: 'GOOGLE',
                    providerUserId: userInfo.providerUserId,
                    email: userInfo.email,
                    accessToken: tokenData.accessToken,
                    refreshToken: tokenData.refreshToken,
                    accessTokenExpiryDateTime:
                        tokenData.accessTokenExpiryDateTime,
                    refreshTokenExpiryDateTime: null,
                })
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

        return { sessionToken: session.getToken(), suggestLinkingEmail }
    }
}
