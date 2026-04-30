import { describe, expect, it } from 'vitest'
import { User, UserInput } from './user'
import { ExternalAccount, ExternalAccountInput } from './external-account'
import bcrypt from 'bcrypt'
import { CONFLICT_ERROR_TYPE, ConflictError } from './error/conflict-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from './error/validation-error'
import { NOT_FOUND_ERROR_TYPE, NotFoundError } from './error/not-found-error'

const createExternalAccountData = (
    overrides?: Partial<ExternalAccountInput>,
): ExternalAccountInput => ({
    provider: 'GOOGLE',
    providerUserId: 'google-user-id',
    email: 'user@gmail.com',
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    accessTokenExpiryDateTime: new Date(),
    refreshTokenExpiryDateTime: new Date(),
    ...overrides,
})

const createUserData = (overrides?: Partial<UserInput>): User =>
    new User({
        id: 'user-id',
        email: null,
        isEmailVerified: false,
        name: 'User Name',
        passwordHash: null,
        credits: 300,
        externalAccounts: [],
        emailVerificationCode: null,
        resetPasswordCode: null,
        ...overrides,
    })

describe('Gerenciamento de conta do usuário', () => {
    describe('Adicionar login social', () => {
        it('deve adicionar uma conta do Google ao usuário', () => {
            const user = createUserData()
            const externalAccount = createExternalAccountData()

            user.addExternalAccount(externalAccount)

            expect(user.hasExternalAccount('GOOGLE')).toBe(true)
            expect(user.getGoogleEmail()).toBe('user@gmail.com')
        })
    })

    describe('Vincular login social ao login por email/senha', () => {
        it('deve vincular conta do Google com sucesso quando tem login por email', () => {
            const user = createUserData({
                email: 'user@gmail.com',
                passwordHash: 'password-hash',
                isEmailVerified: true,
            })

            user.addExternalAccountWithSameEmail('GOOGLE', {
                providerUserId: 'new-google-id',
                accessToken: 'new-access-token',
                refreshToken: 'new-refresh-token',
                accessTokenExpiryDateTime: new Date(),
                refreshTokenExpiryDateTime: new Date(),
            })

            expect(user.getGoogleEmail()).toBe('user@gmail.com')
        })

        it('deve dar erro ao tentar vincular se já existe conta do Google', () => {
            const user = createUserData({
                email: 'user@gmail.com',
                passwordHash: 'password-hash',
                isEmailVerified: true,
                externalAccounts: [
                    new ExternalAccount(createExternalAccountData()),
                ],
            })

            try {
                user.addExternalAccountWithSameEmail('GOOGLE', {
                    providerUserId: 'another-google-id',
                    accessToken: 'access-token',
                    refreshToken: 'refresh-token',
                    accessTokenExpiryDateTime: new Date(),
                    refreshTokenExpiryDateTime: new Date(),
                })
            } catch (error: any) {
                expect(error).toBeInstanceOf(ConflictError)
                expect(error.type).toBe(
                    CONFLICT_ERROR_TYPE.EXTERNAL_ACCOUNT_ALREADY_EXISTS,
                )
            }
        })

        it('deve dar erro ao tentar vincular se não tem login por email', () => {
            const user = createUserData()

            try {
                user.addExternalAccountWithSameEmail('GOOGLE', {
                    providerUserId: 'google-id',
                    accessToken: 'access-token',
                    refreshToken: 'refresh-token',
                    accessTokenExpiryDateTime: new Date(),
                    refreshTokenExpiryDateTime: new Date(),
                })
            } catch (error: any) {
                expect(error).toBeInstanceOf(ValidationError)
                expect(error.type).toBe(
                    VALIDATION_ERROR_TYPE.SYSTEM_LOGIN_NOT_ENABLED,
                )
            }
        })
    })

    describe('Remover login social', () => {
        it('deve remover conta do Google quando há alguma outra forma de login', () => {
            const user = createUserData({
                email: 'user@gmail.com',
                passwordHash: 'password-hash',
                isEmailVerified: true,
                externalAccounts: [
                    new ExternalAccount(createExternalAccountData()),
                ],
            })

            const removedAccount = user.removeExternalAccount('GOOGLE')

            expect(removedAccount.provider).toBe('GOOGLE')
            expect(user.hasExternalAccount('GOOGLE')).toBe(false)
        })

        it('deve dar erro ao tentar remover conta do Google com apenas o login por email/senha sem o email estar verificado ainda', () => {
            const user = createUserData({
                email: 'user@gmail.com',
                passwordHash: 'password-hash',
                externalAccounts: [
                    new ExternalAccount(createExternalAccountData()),
                ],
            })

            try {
                user.removeExternalAccount('GOOGLE')
            } catch (error: any) {
                expect(error).toBeInstanceOf(ValidationError)
                expect(error.type).toBe(VALIDATION_ERROR_TYPE.LAST_LOGIN_METHOD)
            }
        })

        it('deve dar erro ao tentar remover conta que não existe', () => {
            const user = createUserData()

            try {
                user.removeExternalAccount('GOOGLE')
            } catch (error: any) {
                expect(error).toBeInstanceOf(NotFoundError)
                expect(error.type).toBe(NOT_FOUND_ERROR_TYPE.EXTERNAL_ACCOUNT)
            }
        })

        it('deve dar erro ao tentar remover última forma de login', () => {
            const user = createUserData({
                email: null,
                passwordHash: null,
                isEmailVerified: false,
                externalAccounts: [
                    new ExternalAccount(createExternalAccountData()),
                ],
            })

            try {
                user.removeExternalAccount('GOOGLE')
            } catch (error: any) {
                expect(error).toBeInstanceOf(ValidationError)
                expect(error.type).toBe(VALIDATION_ERROR_TYPE.LAST_LOGIN_METHOD)
            }
        })
    })

    describe('Alterar email', () => {
        it('deve mudar para o email da conta do Google e já ficar verificado', () => {
            const user = createUserData({
                email: 'old@gmail.com',
                passwordHash: 'password-hash',
                isEmailVerified: true,
                externalAccounts: [
                    new ExternalAccount(
                        createExternalAccountData({ email: 'new@gmail.com' }),
                    ),
                ],
            })

            user.changeEmail('new@gmail.com')

            expect(user.getEmail()).toBe('new@gmail.com')
            expect(user.getIsEmailVerified()).toBe(true)
            expect(user.getEmailVerificationCode()).toBeNull()
        })

        it('deve mudar para o mesmo email', () => {
            const user = createUserData({
                email: 'user@gmail.com',
                passwordHash: 'password-hash',
                isEmailVerified: true,
            })

            user.changeEmail('user@gmail.com')

            expect(user.getIsEmailVerified()).toBe(true)
            expect(user.getEmailVerificationCode()).toBeNull()
        })

        it('deve mudar para novo email e gerar código de verificação', () => {
            const user = createUserData({
                email: 'old@gmail.com',
                isEmailVerified: true,
                passwordHash: 'password-hash',
            })

            user.changeEmail('newemail@gmail.com')

            expect(user.getEmail()).toBe('newemail@gmail.com')
            expect(user.getIsEmailVerified()).toBe(false)
            expect(user.getEmailVerificationCode()).not.toBeNull()
        })
    })

    describe('Alterar senha', () => {
        it('deve mudar a senha com sucesso usando a senha atual correta', async () => {
            const user = createUserData({
                email: 'user@gmail.com',
                passwordHash: await bcrypt.hash('oldpassword', 10),
                isEmailVerified: true,
            })

            await user.updatePassword('newpassword', 'oldpassword')

            const isValid = await user.comparePassword('newpassword')
            expect(isValid).toBe(true)
        })

        it('deve dar erro ao tentar mudar senha sem ter login por email', async () => {
            const user = createUserData()

            try {
                await user.updatePassword('newpassword', 'anypassword')
            } catch (error: any) {
                expect(error).toBeInstanceOf(ValidationError)
                expect(error.type).toBe(
                    VALIDATION_ERROR_TYPE.SYSTEM_LOGIN_NOT_ENABLED,
                )
            }
        })

        it('deve dar erro ao digitar a senha atual errada', async () => {
            const user = createUserData({
                email: 'user@gmail.com',
                passwordHash: await bcrypt.hash('correctpassword', 10),
                isEmailVerified: true,
            })

            try {
                await user.updatePassword('newpassword', 'wrongpassword')
            } catch (error: any) {
                expect(error).toBeInstanceOf(ValidationError)
                expect(error.type).toBe(
                    VALIDATION_ERROR_TYPE.CURRENT_PASSWORD_INCORRECT,
                )
            }
        })
    })

    describe('Definir login por email/senha', () => {
        it('deve definir login por email e senha para usuário apenas com login social', async () => {
            const user = createUserData({
                email: null,
                passwordHash: null,
                externalAccounts: [
                    new ExternalAccount(createExternalAccountData()),
                ],
            })

            await user.setSystemLogin('user@gmail.com', 'password123')

            expect(user.getEmail()).toBe('user@gmail.com')
            expect(user.hasSystemLogin()).toBe(true)

            const isValid = await user.comparePassword('password123')
            expect(isValid).toBe(true)
        })
    })

    describe('Vincular login por email/senha à conta do Google', () => {
        it('deve vincular login do sistema à conta do Google quando o email é igual', () => {
            const user = createUserData({
                externalAccounts: [
                    new ExternalAccount(createExternalAccountData()),
                ],
            })

            user.linkSystemAccountWithSameEmail('GOOGLE', 'new-password-hash')

            expect(user.getPasswordHash()).toBe('new-password-hash')
            expect(user.getEmail()).toBe('user@gmail.com')
            expect(user.getIsEmailVerified()).toBe(true)
        })

        it('deve dar erro se a conta do Google não existe', () => {
            const user = createUserData({
                email: 'user@gmail.com',
                passwordHash: 'password-hash',
                isEmailVerified: true,
            })

            try {
                user.linkSystemAccountWithSameEmail('GOOGLE', 'hash')
            } catch (error: any) {
                expect(error).toBeInstanceOf(NotFoundError)
                expect(error.type).toBe(NOT_FOUND_ERROR_TYPE.EXTERNAL_ACCOUNT)
            }
        })

        it('deve dar erro se o usuário já tem login por email', () => {
            const user = createUserData({
                email: 'user@gmail.com',
                passwordHash: 'password-hash',
                isEmailVerified: true,
                externalAccounts: [
                    new ExternalAccount(createExternalAccountData()),
                ],
            })

            try {
                user.linkSystemAccountWithSameEmail('GOOGLE', 'new-hash')
            } catch (error: any) {
                expect(error).toBeInstanceOf(ValidationError)
                expect(error.type).toBe(
                    VALIDATION_ERROR_TYPE.SYSTEM_LOGIN_ENABLED,
                )
            }
        })
    })

    describe('Atualizar tokens da conta do Google', () => {
        it('deve atualizar token de acesso da conta do Google', () => {
            const user = createUserData({
                externalAccounts: [
                    new ExternalAccount(createExternalAccountData()),
                ],
            })

            user.updateExternalAccountTokens('GOOGLE', {
                accessToken: 'new-access-token',
                accessTokenExpiryDateTime: new Date(),
                refreshToken: 'new-refresh-token',
            })

            expect(user.getGoogleAccessToken()).toBe('new-access-token')
            expect(user.getGoogleRefreshToken()).toBe('new-refresh-token')
        })

        it('deve não fazer nada se a conta do Google não existir', () => {
            const user = createUserData()

            user.updateExternalAccountTokens('GOOGLE', {
                accessToken: 'new-access-token',
                accessTokenExpiryDateTime: new Date(),
            })

            expect(user.getGoogleAccessToken()).toBeNull()
        })
    })
})
