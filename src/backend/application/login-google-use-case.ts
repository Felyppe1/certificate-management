import { OAuth2Client } from 'google-auth-library'
import {
    ExternalUserAccount,
    ExternalUserAccountsRepository,
} from './interfaces/external-user-account-repository'
import { SessionsRepository } from './interfaces/sessions-repository'
import { User, UsersRepository } from './interfaces/users-repository'
import crypto from 'crypto'

interface LoginGoogleUseCaseInput {
    code: string
}

export class LoginGoogleUseCase {
    constructor(
        private usersRepository: Pick<UsersRepository, 'save' | 'getByEmail'>,
        private externalUserAccountsRepository: Pick<
            ExternalUserAccountsRepository,
            'save' | 'update' | 'getById'
        >,
        private sessionsRepository: Pick<SessionsRepository, 'save'>,
    ) {}

    async execute({ code }: LoginGoogleUseCaseInput) {
        const oAuth2Client = new OAuth2Client({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            redirectUri:
                process.env.NEXT_PUBLIC_BASE_URL + '/api/auth/google/callback',
        })

        const { tokens } = await oAuth2Client.getToken(code)

        console.log('Tokens received:', tokens)

        if (
            !tokens.scope?.includes(
                'https://www.googleapis.com/auth/drive.file',
            )
        ) {
            throw new Error('Unauthorized')
        }

        const ticket = await oAuth2Client.verifyIdToken({
            idToken: tokens.id_token!,
            audience: process.env.GOOGLE_CLIENT_ID,
        })

        const payload = ticket.getPayload()

        console.log('Payload:', payload)

        const email = payload!.email!

        const userExists = await this.usersRepository.getByEmail(email)

        let newUser: User

        if (!userExists) {
            newUser = {
                id: crypto.randomUUID(),
                email: email,
                name: payload!.name!,
                passwordHash: null,
            }

            await this.usersRepository.save(newUser)
        }

        const user = userExists ?? newUser!

        const externalAccount =
            await this.externalUserAccountsRepository.getById(user.id, 'GOOGLE')

        if (!externalAccount) {
            const newExternalAccount: ExternalUserAccount = {
                userId: user.id,
                provider: 'GOOGLE',
                providerUserId: payload!.sub!,
                accessToken: tokens.access_token!,
                refreshToken: tokens.refresh_token ?? null,
                // TODO: calculate expiry date times
                accessTokenExpiryDateTime: null,
                refreshTokenExpiryDateTime: null,
            }

            await this.externalUserAccountsRepository.save(newExternalAccount)
        } else {
            externalAccount.accessToken = tokens.access_token!
            externalAccount.refreshToken =
                tokens.refresh_token ?? externalAccount.refreshToken
            externalAccount.accessTokenExpiryDateTime = null
            externalAccount.refreshTokenExpiryDateTime = null

            await this.externalUserAccountsRepository.update(externalAccount)
        }

        const sessionToken = crypto.randomBytes(32).toString('hex')

        await this.sessionsRepository.save({
            userId: user.id,
            token: sessionToken,
        })

        return sessionToken
    }
}
