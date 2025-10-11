export interface CheckOrRefreshAccessTokenInput {
    accessTokenExpiryDateTime: Date
    refreshToken: string
    accessToken: string
}

export interface CheckOrRefreshAccessTokenOuput {
    newAccessToken: string
    newAccessTokenExpiryDateTime: Date
}

export interface GetTokenInput {
    code: string
}

export interface GetTokenOutput {
    accessToken: string
    refreshToken: string | null
    accessTokenExpiryDateTime: Date
    scopes: string[]
    idToken: string
}

export interface GetUserInfoInput {
    idToken: string
}

export interface GetUserInfoOutput {
    email: string
    name: string
    providerUserId: string
}

export interface GetOAuth2ClientWithCredentials {
    accessToken: string
    refreshToken: string
}

export interface IGoogleAuthGateway {
    checkOrGetNewAccessToken(
        input: CheckOrRefreshAccessTokenInput,
    ): Promise<CheckOrRefreshAccessTokenOuput | null>
    getToken(input: GetTokenInput): Promise<GetTokenOutput>
    getUserInfo(input: GetUserInfoInput): Promise<GetUserInfoOutput>
    getOAuth2ClientWithCredentials(
        credentials: GetOAuth2ClientWithCredentials,
    ): any
    getAuthClient(): any
}
