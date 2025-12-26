import {
    ExternalUserAccount,
    IExternalUserAccountsRepository,
} from './interfaces/iexternal-user-accounts-repository'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { User, IUsersRepository } from './interfaces/iusers-repository'
import crypto from 'crypto'
import { AuthenticationError } from '../domain/error/authentication-error'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { ITransactionManager } from './interfaces/itransaction-manager'

interface LoginGoogleUseCaseInput {
    code: string
    reAuthenticate: boolean
}

export class LoginGoogleUseCase {
    constructor(
        private usersRepository: Pick<IUsersRepository, 'save' | 'getByEmail'>,
        private externalUserAccountsRepository: Pick<
            IExternalUserAccountsRepository,
            'save' | 'update' | 'getById'
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

        let newUser: User

        if (!userExists) {
            newUser = {
                id: crypto.randomUUID(),
                email: userInfo.email,
                name: userInfo.name,
                passwordHash: null,
            }
        }

        const user = userExists ?? newUser!

        const externalAccount =
            await this.externalUserAccountsRepository.getById(user.id, 'GOOGLE')

        const sessionToken = crypto.randomBytes(32).toString('hex')

        await this.transactionManager.run(async () => {
            if (!userExists) {
                await this.usersRepository.save(newUser!)
            }

            if (!externalAccount) {
                const newExternalAccount: ExternalUserAccount = {
                    userId: user.id,
                    provider: 'GOOGLE',
                    providerUserId: userInfo.providerUserId,
                    accessToken: tokenData.accessToken,
                    refreshToken: tokenData.refreshToken,
                    accessTokenExpiryDateTime:
                        tokenData.accessTokenExpiryDateTime,
                    refreshTokenExpiryDateTime: null, // Not necessary because Google refresh tokens don't expire in Published mode
                }

                await this.externalUserAccountsRepository.save(
                    newExternalAccount,
                )
            } else {
                externalAccount.accessToken = tokenData.accessToken
                externalAccount.refreshToken =
                    tokenData.refreshToken ?? externalAccount.refreshToken
                externalAccount.accessTokenExpiryDateTime =
                    tokenData.accessTokenExpiryDateTime
                externalAccount.refreshTokenExpiryDateTime = null

                await this.externalUserAccountsRepository.update(
                    externalAccount,
                )
            }

            await this.sessionsRepository.save({
                userId: user.id,
                token: sessionToken,
            })
        })

        return sessionToken
    }
}
