import { google, Auth } from 'googleapis'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import {
    CheckOrRefreshAccessTokenInput,
    GetOAuth2ClientWithCredentials,
    GetTokenInput,
    GetUserInfoInput,
    IGoogleAuthGateway,
} from '@/backend/application/interfaces/igoogle-auth-gateway'

export class GoogleAuthGateway implements IGoogleAuthGateway {
    private readonly oauth2Client: Auth.OAuth2Client
    private readonly authClient: Auth.GoogleAuth

    constructor() {
        this.oauth2Client = new google.auth.OAuth2({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            redirectUri:
                process.env.NEXT_PUBLIC_BASE_URL + '/api/auth/google/callback',
        })

        this.authClient = new google.auth.GoogleAuth({
            apiKey: process.env.GOOGLE_API_KEY,
            scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        })
    }

    getAuthClient() {
        return this.authClient
    }

    getOAuth2Client() {
        return this.oauth2Client
    }

    getOAuth2ClientWithCredentials(
        credentials: GetOAuth2ClientWithCredentials,
    ) {
        this.oauth2Client.setCredentials({
            access_token: credentials.accessToken,
            refresh_token: credentials.refreshToken,
        })

        return this.oauth2Client
    }

    async checkOrGetNewAccessToken({
        accessToken,
        refreshToken,
        accessTokenExpiryDateTime,
    }: CheckOrRefreshAccessTokenInput) {
        if (accessTokenExpiryDateTime! > new Date()) return null

        this.oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken,
        })

        try {
            const { credentials } = await this.oauth2Client.refreshAccessToken()

            const accessTokenExpiryDate = new Date(credentials.expiry_date!)
            // const refreshTokenExpiryDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000) // 6 days from now

            // console.log('antes', refreshTokenExpiryDateTime)
            // console.log('depoi', new Date(Date.now() + (credentials.refresh_token_expires_in)))
            // externalAccount.accessToken = credentials.access_token!
            // externalAccount.refreshToken =
            //     credentials.refresh_token ?? externalAccount.refreshToken
            // externalAccount.accessTokenExpiryDateTime = accessTokenExpiryDate
            // externalAccount.refreshTokenExpiryDateTime = refreshTokenExpiryDate

            // await externalUserAccountsRepository.update(externalAccount)

            return {
                newAccessToken: credentials.access_token!,
                newAccessTokenExpiryDateTime: accessTokenExpiryDate,
            }
        } catch (error: any) {
            console.error('Error refreshing access token:', error)

            throw new AuthenticationError('google-token-refresh-failed')
        }
    }

    async getToken({ code }: GetTokenInput) {
        const { tokens } = await this.oauth2Client.getToken(code)

        return {
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token ?? null,
            accessTokenExpiryDateTime: new Date(tokens.expiry_date!),
            scopes: tokens.scope!.split(' '),
            idToken: tokens.id_token!,
        }
    }

    async getUserInfo({ idToken }: GetUserInfoInput) {
        const ticket = await this.oauth2Client.verifyIdToken({
            idToken: idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        })

        const payload = ticket.getPayload()

        return {
            email: payload!.email!,
            name: payload!.name!,
            providerUserId: payload!.sub!,
        }
    }
}
