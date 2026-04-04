import { Entity } from './primitives/entity'

export type Provider = 'GOOGLE'

export interface ExternalAccountInput {
    provider: Provider
    providerUserId: string
    accessToken: string
    refreshToken: string | null
    accessTokenExpiryDateTime: Date | null
    refreshTokenExpiryDateTime: Date | null
}

export interface ExternalAccountOutput {
    provider: Provider
    providerUserId: string
    accessToken: string
    refreshToken: string | null
    accessTokenExpiryDateTime: Date | null
    refreshTokenExpiryDateTime: Date | null
}

export class ExternalAccount extends Entity {
    private provider: Provider
    private accessToken: string
    private refreshToken: string | null
    private accessTokenExpiryDateTime: Date | null
    private refreshTokenExpiryDateTime: Date | null

    constructor(data: ExternalAccountInput) {
        super(data.providerUserId)

        if (!data.provider) {
            throw new Error('Provider is required for ExternalAccount')
        }

        if (!data.accessToken) {
            throw new Error('Access token is required for ExternalAccount')
        }

        if (data.provider === 'GOOGLE') {
            if (!data.refreshToken) {
                throw new Error(
                    'Refresh token is required for Google ExternalAccount',
                )
            }

            if (!data.accessTokenExpiryDateTime) {
                throw new Error(
                    'Access token expiry date time is required for Google ExternalAccount',
                )
            }

            // if (!data.refreshTokenExpiryDateTime) {
            //     throw new Error('Refresh token expiry date time is required for Google ExternalAccount')
            // }
        }

        this.provider = data.provider
        this.accessToken = data.accessToken
        this.refreshToken = data.refreshToken
        this.accessTokenExpiryDateTime = data.accessTokenExpiryDateTime
        this.refreshTokenExpiryDateTime = data.refreshTokenExpiryDateTime
    }

    updateTokens(
        accessToken: string,
        accessTokenExpiryDateTime: Date | null,
        refreshToken?: string | null,
    ): void {
        this.accessToken = accessToken
        this.accessTokenExpiryDateTime = accessTokenExpiryDateTime
        if (refreshToken !== undefined) {
            this.refreshToken = refreshToken
        }
    }

    getProvider(): Provider {
        return this.provider
    }

    getProviderUserId(): string {
        return this.getId()
    }

    getAccessToken(): string {
        return this.accessToken
    }

    getRefreshToken(): string | null {
        return this.refreshToken
    }

    getAccessTokenExpiryDateTime(): Date | null {
        return this.accessTokenExpiryDateTime
    }

    getRefreshTokenExpiryDateTime(): Date | null {
        return this.refreshTokenExpiryDateTime
    }

    serialize(): ExternalAccountOutput {
        return {
            providerUserId: this.getId(),
            provider: this.provider,
            accessToken: this.accessToken,
            refreshToken: this.refreshToken,
            accessTokenExpiryDateTime: this.accessTokenExpiryDateTime,
            refreshTokenExpiryDateTime: this.refreshTokenExpiryDateTime,
        }
    }
}
