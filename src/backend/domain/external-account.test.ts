import { describe, expect, it } from 'vitest'
import { ExternalAccount, ExternalAccountInput } from './external-account'

const createData = (overrides?: Partial<ExternalAccountInput>): ExternalAccountInput => ({
    provider: 'GOOGLE',
    providerUserId: 'google-user-id',
    email: 'user@gmail.com',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    accessTokenExpiryDateTime: new Date(),
    refreshTokenExpiryDateTime: null,
    ...overrides,
})

describe('ExternalAccount', () => {
    describe('Construção', () => {
        it('deve criar conta Google válida com sucesso', () => {
            const account = new ExternalAccount(createData())

            expect(account.getProvider()).toBe('GOOGLE')
            expect(account.getEmail()).toBe('user@gmail.com')
            expect(account.getAccessToken()).toBe('access-token')
            expect(account.getRefreshToken()).toBe('refresh-token')
        })

        describe('deve lançar erro com dados inválidos', () => {
            it('provider ausente', () => {
                expect(() =>
                    new ExternalAccount(createData({ provider: '' as any })),
                ).toThrow('Provider is required for ExternalAccount')
            })

            it('accessToken ausente', () => {
                expect(() =>
                    new ExternalAccount(createData({ accessToken: '' })),
                ).toThrow('Access token is required for ExternalAccount')
            })

            it('Google sem refreshToken', () => {
                expect(() =>
                    new ExternalAccount(
                        createData({ provider: 'GOOGLE', refreshToken: null }),
                    ),
                ).toThrow('Refresh token is required for Google ExternalAccount')
            })

            it('Google sem accessTokenExpiryDateTime', () => {
                expect(() =>
                    new ExternalAccount(
                        createData({
                            provider: 'GOOGLE',
                            accessTokenExpiryDateTime: null,
                        }),
                    ),
                ).toThrow(
                    'Access token expiry date time is required for Google ExternalAccount',
                )
            })
        })
    })

    describe('Atualização de tokens', () => {
        it('deve atualizar access token e expiração', () => {
            const account = new ExternalAccount(createData())
            const newExpiry = new Date(Date.now() + 3600 * 1000)

            account.updateTokens('new-access', newExpiry)

            expect(account.getAccessToken()).toBe('new-access')
            expect(account.getAccessTokenExpiryDateTime()).toBe(newExpiry)
        })

        it('deve atualizar refresh token quando fornecido', () => {
            const account = new ExternalAccount(createData())

            account.updateTokens('new-access', new Date(), 'new-refresh')

            expect(account.getRefreshToken()).toBe('new-refresh')
        })

        it('deve manter refresh token quando undefined é passado', () => {
            const account = new ExternalAccount(createData({ refreshToken: 'original-refresh' }))

            account.updateTokens('new-access', new Date(), undefined)

            expect(account.getRefreshToken()).toBe('original-refresh')
        })

        it('deve permitir setar refresh token como null quando explicitamente passado', () => {
            const account = new ExternalAccount(createData())

            account.updateTokens('new-access', new Date(), null)

            expect(account.getRefreshToken()).toBeNull()
        })
    })
})