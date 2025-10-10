export type Provider = 'GOOGLE'

export interface ExternalUserAccount {
    userId: string
    provider: Provider
    providerUserId: string
    accessToken: string
    refreshToken: string | null
    accessTokenExpiryDateTime: Date | null
    refreshTokenExpiryDateTime: Date | null
}

export interface IExternalUserAccountsRepository {
    getById(
        userId: string,
        provider: Provider,
    ): Promise<ExternalUserAccount | null>
    save(account: ExternalUserAccount): Promise<void>
    getManyByUserId(userId: string): Promise<ExternalUserAccount[]>
    update(account: ExternalUserAccount): Promise<void>
}
