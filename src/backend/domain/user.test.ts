import { describe, expect, it } from 'vitest'
import { User, UserInput, USER_CREDITS } from './user'
import { ExternalAccount, ExternalAccountInput } from './external-account'
import { EmailChangeCode } from './email-change-code'
import bcrypt from 'bcrypt'
import { ExternalAccountAlreadyExistsError } from './error/conflict-error/external-account-already-exists-error'
import { SystemLoginNotEnabledError } from './error/validation-error/system-login-not-enabled-error'
import { LastLoginMethodError } from './error/validation-error/last-login-method-error'
import { EmailAlreadyVerifiedError } from './error/validation-error/email-already-verified-error'
import { CurrentPasswordIncorrectError } from './error/validation-error/current-password-incorrect-error'
import { SystemLoginEnabledError } from './error/validation-error/system-login-enabled-error'
import { ExternalAccountNotFoundError } from './error/not-found-error/external-account-not-found-error'
import { EmailChangeCodeExpiredError } from './error/forbidden-error/email-change-code-expired-error'
import { EmailChangeCodeInvalidError } from './error/forbidden-error/email-change-code-invalid-error'
import { ResetPasswordCode } from './reset-password-code'
import { EmailVerificationCode } from './email-verification-code'
import { ResetPasswordCodeExpiredError } from './error/forbidden-error/reset-password-code-expired-error'
import { ResetPasswordCodeInvalidError } from './error/forbidden-error/reset-password-code-invalid-error'
import { VerificationCodeExpiredError } from './error/forbidden-error/verification-code-expired-error'
import { VerificationCodeInvalidError } from './error/forbidden-error/verification-code-invalid-error'

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
        emailChangeCode: null,
        ...overrides,
    })

function createExpiredEmailChangeCode(newEmail: string) {
    return new EmailChangeCode({
        newEmail,
        code: '123456',
        expiresAt: new Date(Date.now() - 1000),
    })
}

function createExpiredResetPasswordCode() {
    return new ResetPasswordCode({
        code: '123456',
        expiresAt: new Date(Date.now() - 1000),
    })
}

function createExpiredVerificationCode() {
    return new EmailVerificationCode({
        code: '654321',
        expiresAt: new Date(Date.now() - 1000),
    })
}

describe('User', () => {
    describe('Criar usuário', () => {
        it('deve criar usuário sem email com créditos padrão e sem código de verificação', async () => {
            const user = await User.create({
                name: 'Novo Usuário',
                email: null,
                passwordHash: null,
            })

            expect(user.getId()).toBeTruthy()
            expect(user.getName()).toBe('Novo Usuário')
            expect(user.getEmail()).toBeNull()
            expect(user.getPasswordHash()).toBeNull()
            expect(user.getCredits()).toBe(USER_CREDITS)
            expect(user.getEmailVerificationCode()).toBeNull()
        })

        it('deve criar usuário com email e senha com hash e código de verificação com sucesso', async () => {
            const user = await User.create({
                name: 'Novo Usuário',
                email: 'user@example.com',
                passwordHash: 'senha-clara',
            })

            expect(user.getEmail()).toBe('user@example.com')
            expect(await user.comparePassword('senha-clara')).toBe(true)
            expect(user.getEmailVerificationCode()).not.toBeNull()
        })

        describe('deve aceitar senha válida na criação', () => {
            it('6 caracteres (limite mínimo)', async () => {
                await expect(
                    User.create({
                        name: 'Ana Silva',
                        email: 'a@b.com',
                        passwordHash: 'Ab@1xy',
                    }),
                ).resolves.toBeDefined()
            })

            it('7 caracteres (acima do limite mínimo)', async () => {
                await expect(
                    User.create({
                        name: 'Ana Silva',
                        email: 'a@b.com',
                        passwordHash: 'Ab@1xyz',
                    }),
                ).resolves.toBeDefined()
            })

            it('99 caracteres (abaixo do limite máximo)', async () => {
                await expect(
                    User.create({
                        name: 'Ana Silva',
                        email: 'a@b.com',
                        passwordHash: 'A'.repeat(99),
                    }),
                ).resolves.toBeDefined()
            })

            it('100 caracteres (limite máximo)', async () => {
                await expect(
                    User.create({
                        name: 'Ana Silva',
                        email: 'a@b.com',
                        passwordHash: 'A'.repeat(100),
                    }),
                ).resolves.toBeDefined()
            })
        })

        describe('deve lançar erro com senha inválida na criação', () => {
            it('5 caracteres (abaixo do mínimo)', async () => {
                await expect(
                    User.create({
                        name: 'Ana Silva',
                        email: 'a@b.com',
                        passwordHash: 'Ab@1x',
                    }),
                ).rejects.toThrow(
                    'Invalid password: min 6 chars, max 100 chars',
                )
            })

            it('101 caracteres (acima do máximo)', async () => {
                await expect(
                    User.create({
                        name: 'Ana Silva',
                        email: 'a@b.com',
                        passwordHash: 'A'.repeat(101),
                    }),
                ).rejects.toThrow(
                    'Invalid password: min 6 chars, max 100 chars',
                )
            })
        })
    })

    describe('Validação', () => {
        it('deve lançar erro quando o id não é fornecido', () => {
            expect(() => createUserData({ id: '' })).toThrow(
                'Entity ID is required',
            )
        })

        it('deve lançar erro quando o nome não é fornecido', () => {
            expect(() => createUserData({ name: '' })).toThrow(
                'User name is required',
            )
        })

        it('deve lançar erro quando os créditos não são fornecidos', () => {
            expect(() => createUserData({ credits: null as any })).toThrow(
                'User credits is required',
            )
        })

        it('deve lançar erro quando a lista de contas externas não é fornecida', () => {
            expect(() =>
                createUserData({ externalAccounts: null as any }),
            ).toThrow('User external accounts list is required')
        })

        it('deve lançar erro quando o email é fornecido sem o hash de senha', () => {
            expect(() =>
                createUserData({
                    email: 'user@example.com',
                    passwordHash: null,
                }),
            ).toThrow('User password hash is required when email is provided')
        })

        it('deve lançar erro quando o hash de senha é fornecido sem o email', () => {
            expect(() =>
                createUserData({ email: null, passwordHash: 'hash' }),
            ).toThrow('User email is required when password hash is provided')
        })
    })

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

            expect(() =>
                user.addExternalAccountWithSameEmail('GOOGLE', {
                    providerUserId: 'another-google-id',
                    accessToken: 'access-token',
                    refreshToken: 'refresh-token',
                    accessTokenExpiryDateTime: new Date(),
                    refreshTokenExpiryDateTime: new Date(),
                }),
            ).toThrow(ExternalAccountAlreadyExistsError)
        })

        it('deve dar erro ao tentar vincular se não tem login por email', () => {
            const user = createUserData()

            expect(() =>
                user.addExternalAccountWithSameEmail('GOOGLE', {
                    providerUserId: 'google-id',
                    accessToken: 'access-token',
                    refreshToken: 'refresh-token',
                    accessTokenExpiryDateTime: new Date(),
                    refreshTokenExpiryDateTime: new Date(),
                }),
            ).toThrow(SystemLoginNotEnabledError)
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

            expect(() => user.removeExternalAccount('GOOGLE')).toThrow(
                LastLoginMethodError,
            )
        })

        it('deve dar erro ao tentar remover conta que não existe', () => {
            const user = createUserData()

            expect(() => user.removeExternalAccount('GOOGLE')).toThrow(
                ExternalAccountNotFoundError,
            )
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

            expect(() => user.removeExternalAccount('GOOGLE')).toThrow(
                LastLoginMethodError,
            )
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
            expect(user.getEmailChangeCode()).toBeNull()
        })

        it('deve dar erro ao tentar mudar para o mesmo email', () => {
            const user = createUserData({
                email: 'user@gmail.com',
                passwordHash: 'password-hash',
                isEmailVerified: true,
            })

            expect(() => user.changeEmail('user@gmail.com')).toThrow(
                EmailAlreadyVerifiedError,
            )
        })

        it('deve gerar o código de verificação para o novo email', () => {
            const user = createUserData({
                email: 'old@gmail.com',
                isEmailVerified: true,
                passwordHash: 'password-hash',
            })

            user.changeEmail('newemail@gmail.com')

            expect(user.getEmail()).toBe('old@gmail.com')
            expect(user.getIsEmailVerified()).toBe(true)
            expect(user.getEmailVerificationCode()).toBeNull()
            expect(user.getEmailChangeCode()).not.toBeNull()
            expect(user.getEmailRequestedForChange()).toBe('newemail@gmail.com')
        })

        it('deve dar erro ao tentar alterar email sem ter login por email', () => {
            const user = createUserData({
                externalAccounts: [
                    new ExternalAccount(createExternalAccountData()),
                ],
            })

            expect(() => user.changeEmail('novo@gmail.com')).toThrow(
                SystemLoginNotEnabledError,
            )
        })
    })

    describe('Confirmar troca de email', () => {
        it('deve confirmar troca de email com código válido', () => {
            const validCode = new EmailChangeCode({
                newEmail: 'new@gmail.com',
                code: '654321',
                expiresAt: new Date(Date.now() + 60_000),
            })
            const user = createUserData({
                email: 'old@gmail.com',
                passwordHash: 'password-hash',
                isEmailVerified: true,
                emailChangeCode: validCode,
            })

            user.confirmEmailChange('654321')

            expect(user.getEmail()).toBe('new@gmail.com')
            expect(user.getEmailChangeCode()).toBeNull()
        })

        it('deve lançar erro quando não há código de troca pendente', () => {
            const user = createUserData({
                email: 'old@gmail.com',
                passwordHash: 'password-hash',
                isEmailVerified: true,
            })

            expect(() => user.confirmEmailChange('123456')).toThrow(
                EmailChangeCodeExpiredError,
            )
        })

        it('deve lançar erro com código expirado', () => {
            const user = createUserData({
                email: 'old@gmail.com',
                passwordHash: 'password-hash',
                isEmailVerified: true,
                emailChangeCode: createExpiredEmailChangeCode('new@gmail.com'),
            })

            expect(() => user.confirmEmailChange('123456')).toThrow(
                EmailChangeCodeExpiredError,
            )
        })

        it('deve lançar erro com código incorreto', () => {
            const validCode = new EmailChangeCode({
                newEmail: 'new@gmail.com',
                code: '654321',
                expiresAt: new Date(Date.now() + 60_000),
            })
            const user = createUserData({
                email: 'old@gmail.com',
                passwordHash: 'password-hash',
                isEmailVerified: true,
                emailChangeCode: validCode,
            })

            expect(() => user.confirmEmailChange('000000')).toThrow(
                EmailChangeCodeInvalidError,
            )
        })
    })

    describe('Cancelar troca de email', () => {
        it('deve cancelar troca de email pendente', () => {
            const validCode = new EmailChangeCode({
                newEmail: 'new@gmail.com',
                code: '654321',
                expiresAt: new Date(Date.now() + 60_000),
            })
            const user = createUserData({
                email: 'old@gmail.com',
                passwordHash: 'password-hash',
                isEmailVerified: true,
                emailChangeCode: validCode,
            })

            user.cancelEmailChange()

            expect(user.getEmailChangeCode()).toBeNull()
        })

        it('não deve lançar erro quando não há troca de email pendente', () => {
            const user = createUserData({
                email: 'old@gmail.com',
                passwordHash: 'password-hash',
                isEmailVerified: true,
            })

            expect(() => user.cancelEmailChange()).not.toThrow()
            expect(user.getEmailChangeCode()).toBeNull()
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

            await expect(
                user.updatePassword('newpassword', 'anypassword'),
            ).rejects.toThrow(SystemLoginNotEnabledError)
        })

        it('deve dar erro ao digitar a senha atual errada', async () => {
            const user = createUserData({
                email: 'user@gmail.com',
                passwordHash: await bcrypt.hash('correctpassword', 10),
                isEmailVerified: true,
            })

            await expect(
                user.updatePassword('newpassword', 'wrongpassword'),
            ).rejects.toThrow(CurrentPasswordIncorrectError)
        })

        describe('deve aceitar nova senha válida', () => {
            it('6 caracteres (limite mínimo)', async () => {
                const user = createUserData({
                    email: 'u@g.com',
                    passwordHash: await bcrypt.hash('oldpass', 10),
                    isEmailVerified: true,
                })
                await expect(
                    user.updatePassword('Ab@1xy', 'oldpass'),
                ).resolves.toBeUndefined()
            })

            it('7 caracteres (acima do limite mínimo)', async () => {
                const user = createUserData({
                    email: 'u@g.com',
                    passwordHash: await bcrypt.hash('oldpass', 10),
                    isEmailVerified: true,
                })
                await expect(
                    user.updatePassword('Ab@1xyz', 'oldpass'),
                ).resolves.toBeUndefined()
            })

            it('99 caracteres (abaixo do limite máximo)', async () => {
                const user = createUserData({
                    email: 'u@g.com',
                    passwordHash: await bcrypt.hash('oldpass', 10),
                    isEmailVerified: true,
                })
                await expect(
                    user.updatePassword('A'.repeat(99), 'oldpass'),
                ).resolves.toBeUndefined()
            })

            it('100 caracteres (limite máximo)', async () => {
                const user = createUserData({
                    email: 'u@g.com',
                    passwordHash: await bcrypt.hash('oldpass', 10),
                    isEmailVerified: true,
                })
                await expect(
                    user.updatePassword('A'.repeat(100), 'oldpass'),
                ).resolves.toBeUndefined()
            })
        })

        describe('deve lançar erro com nova senha inválida', () => {
            it('5 caracteres (abaixo do mínimo)', async () => {
                const user = createUserData({
                    email: 'u@g.com',
                    passwordHash: await bcrypt.hash('oldpass', 10),
                    isEmailVerified: true,
                })
                await expect(
                    user.updatePassword('Ab@1x', 'oldpass'),
                ).rejects.toThrow(
                    'Invalid password: min 6 chars, max 100 chars',
                )
            })

            it('101 caracteres (acima do máximo)', async () => {
                const user = createUserData({
                    email: 'u@g.com',
                    passwordHash: await bcrypt.hash('oldpass', 10),
                    isEmailVerified: true,
                })
                await expect(
                    user.updatePassword('A'.repeat(101), 'oldpass'),
                ).rejects.toThrow(
                    'Invalid password: min 6 chars, max 100 chars',
                )
            })
        })
    })

    describe('Atualizar nome', () => {
        it('deve atualizar nome com sucesso', () => {
            const user = createUserData({
                email: 'user@gmail.com',
                passwordHash: 'hash',
            })

            user.updateName('Novo Nome')

            expect(user.getName()).toBe('Novo Nome')
        })

        describe('deve aceitar nome válido', () => {
            it('3 caracteres (limite mínimo)', () => {
                const user = createUserData({
                    email: 'u@g.com',
                    passwordHash: 'h',
                })
                expect(() => user.updateName('Ana')).not.toThrow()
            })

            it('4 caracteres (acima do limite mínimo)', () => {
                const user = createUserData({
                    email: 'u@g.com',
                    passwordHash: 'h',
                })
                expect(() => user.updateName('ABCD')).not.toThrow()
            })

            it('49 caracteres (abaixo do limite máximo)', () => {
                const user = createUserData({
                    email: 'u@g.com',
                    passwordHash: 'h',
                })
                expect(() => user.updateName('A'.repeat(49))).not.toThrow()
            })

            it('100 caracteres (limite máximo)', () => {
                const user = createUserData({
                    email: 'u@g.com',
                    passwordHash: 'h',
                })
                expect(() => user.updateName('A'.repeat(100))).not.toThrow()
            })
        })

        describe('deve lançar erro com nome inválido', () => {
            it('2 caracteres (abaixo do mínimo)', () => {
                const user = createUserData({
                    email: 'u@g.com',
                    passwordHash: 'h',
                })
                expect(() => user.updateName('AB')).toThrow(
                    'Invalid name: min 3 chars, max 100 chars',
                )
            })

            it('101 caracteres (acima do máximo)', () => {
                const user = createUserData({
                    email: 'u@g.com',
                    passwordHash: 'h',
                })
                expect(() => user.updateName('A'.repeat(101))).toThrow(
                    'Invalid name: min 3 chars, max 100 chars',
                )
            })
        })

        it('deve remover espaços do início e fim', () => {
            const user = createUserData({ email: 'u@g.com', passwordHash: 'h' })

            user.updateName('  Nome Com Espaços  ')

            expect(user.getName()).toBe('Nome Com Espaços')
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

        it('deve marcar email como verificado quando o email pertence à conta Google', async () => {
            const user = createUserData({
                externalAccounts: [
                    new ExternalAccount(
                        createExternalAccountData({ email: 'user@gmail.com' }),
                    ),
                ],
            })

            await user.setSystemLogin('user@gmail.com', 'password123')

            expect(user.getIsEmailVerified()).toBe(true)
            expect(user.getEmailVerificationCode()).toBeNull()
        })

        it('deve gerar código de verificação quando o email não pertence à conta Google', async () => {
            const user = createUserData({
                externalAccounts: [
                    new ExternalAccount(
                        createExternalAccountData({
                            email: 'google@gmail.com',
                        }),
                    ),
                ],
            })

            await user.setSystemLogin('outro@email.com', 'password123')

            expect(user.getIsEmailVerified()).toBe(false)
            expect(user.getEmailVerificationCode()).not.toBeNull()
        })

        const makeUserWithoutSystemLogin = () =>
            createUserData({
                email: null,
                passwordHash: null,
                externalAccounts: [
                    new ExternalAccount(createExternalAccountData()),
                ],
            })

        describe('deve aceitar senha válida ao definir login', () => {
            it('6 caracteres (limite mínimo)', async () => {
                await expect(
                    makeUserWithoutSystemLogin().setSystemLogin(
                        'a@b.com',
                        'Ab@1xy',
                    ),
                ).resolves.toBeUndefined()
            })

            it('7 caracteres (acima do limite mínimo)', async () => {
                await expect(
                    makeUserWithoutSystemLogin().setSystemLogin(
                        'a@b.com',
                        'Ab@1xyz',
                    ),
                ).resolves.toBeUndefined()
            })

            it('99 caracteres (abaixo do limite máximo)', async () => {
                await expect(
                    makeUserWithoutSystemLogin().setSystemLogin(
                        'a@b.com',
                        'A'.repeat(99),
                    ),
                ).resolves.toBeUndefined()
            })

            it('100 caracteres (limite máximo)', async () => {
                await expect(
                    makeUserWithoutSystemLogin().setSystemLogin(
                        'a@b.com',
                        'A'.repeat(100),
                    ),
                ).resolves.toBeUndefined()
            })
        })

        describe('deve lançar erro com senha inválida ao definir login', () => {
            it('5 caracteres (abaixo do mínimo)', async () => {
                await expect(
                    makeUserWithoutSystemLogin().setSystemLogin(
                        'a@b.com',
                        'Ab@1x',
                    ),
                ).rejects.toThrow(
                    'Invalid password: min 6 chars, max 100 chars',
                )
            })

            it('101 caracteres (acima do máximo)', async () => {
                await expect(
                    makeUserWithoutSystemLogin().setSystemLogin(
                        'a@b.com',
                        'A'.repeat(101),
                    ),
                ).rejects.toThrow(
                    'Invalid password: min 6 chars, max 100 chars',
                )
            })
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

            expect(() =>
                user.linkSystemAccountWithSameEmail('GOOGLE', 'hash'),
            ).toThrow(ExternalAccountNotFoundError)
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

            expect(() =>
                user.linkSystemAccountWithSameEmail('GOOGLE', 'new-hash'),
            ).toThrow(SystemLoginEnabledError)
        })
    })

    describe('Cancelar login por email/senha', () => {
        it('deve limpar email, senha e código de verificação', () => {
            const user = createUserData({
                email: 'user@gmail.com',
                passwordHash: 'password-hash',
                isEmailVerified: true,
                externalAccounts: [
                    new ExternalAccount(createExternalAccountData()),
                ],
            })

            user.cancelSystemLogin()

            expect(user.getEmail()).toBeNull()
            expect(user.getPasswordHash()).toBeNull()
            expect(user.getEmailVerificationCode()).toBeNull()
        })

        it('deve marcar email como não verificado', () => {
            const user = createUserData({
                email: 'user@gmail.com',
                passwordHash: 'password-hash',
                isEmailVerified: true,
                externalAccounts: [
                    new ExternalAccount(createExternalAccountData()),
                ],
            })

            user.cancelSystemLogin()

            expect(user.getIsEmailVerified()).toBe(false)
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

    describe('Gerar código de redefinição de senha', () => {
        it('deve lançar erro quando o usuário não tem login por email/senha', () => {
            const user = createUserData()

            expect(() => user.generateResetPasswordCode()).toThrow(
                SystemLoginNotEnabledError,
            )
        })

        it('deve gerar o código de redefinição de senha com sucesso', () => {
            const user = createUserData({
                email: 'user@example.com',
                passwordHash: 'hash',
            })

            user.generateResetPasswordCode()

            expect(user.getResetPasswordCode()).not.toBeNull()
        })
    })

    describe('Validar código de redefinição de senha', () => {
        it('deve lançar erro quando o usuário não tem login por email/senha', () => {
            const user = createUserData()

            expect(() => user.validateResetPasswordCode('123456')).toThrow(
                SystemLoginNotEnabledError,
            )
        })

        it('deve lançar erro quando não há código pendente', () => {
            const user = createUserData({
                email: 'user@example.com',
                passwordHash: 'hash',
            })

            expect(() => user.validateResetPasswordCode('123456')).toThrow(
                ResetPasswordCodeExpiredError,
            )
        })

        it('deve lançar erro com código expirado', () => {
            const user = createUserData({
                email: 'user@example.com',
                passwordHash: 'hash',
                resetPasswordCode: createExpiredResetPasswordCode(),
            })

            expect(() => user.validateResetPasswordCode('123456')).toThrow(
                ResetPasswordCodeExpiredError,
            )
        })

        it('deve lançar erro com código incorreto', () => {
            const user = createUserData({
                email: 'user@example.com',
                passwordHash: 'hash',
                resetPasswordCode: new ResetPasswordCode({
                    code: '654321',
                    expiresAt: new Date(Date.now() + 60_000),
                }),
            })

            expect(() => user.validateResetPasswordCode('000000')).toThrow(
                ResetPasswordCodeInvalidError,
            )
        })

        it('deve validar o código correto com sucesso', () => {
            const user = createUserData({
                email: 'user@example.com',
                passwordHash: 'hash',
                resetPasswordCode: new ResetPasswordCode({
                    code: '654321',
                    expiresAt: new Date(Date.now() + 60_000),
                }),
            })

            expect(() => user.validateResetPasswordCode('654321')).not.toThrow()
        })
    })

    describe('Redefinir senha', () => {
        it('deve lançar erro com código inválido', async () => {
            const user = createUserData({
                email: 'user@example.com',
                passwordHash: 'hash',
                resetPasswordCode: new ResetPasswordCode({
                    code: '654321',
                    expiresAt: new Date(Date.now() + 60_000),
                }),
            })

            await expect(
                user.resetPassword('000000', 'nova-senha'),
            ).rejects.toThrow(ResetPasswordCodeInvalidError)
        })

        it('deve redefinir a senha com código válido com sucesso', async () => {
            const user = createUserData({
                email: 'user@example.com',
                passwordHash: 'hash',
                resetPasswordCode: new ResetPasswordCode({
                    code: '654321',
                    expiresAt: new Date(Date.now() + 60_000),
                }),
            })

            await user.resetPassword('654321', 'nova-senha')

            expect(await user.comparePassword('nova-senha')).toBe(true)
            expect(user.getResetPasswordCode()).toBeNull()
        })

        const makeUserWithCode = () =>
            createUserData({
                email: 'user@example.com',
                passwordHash: 'hash',
                resetPasswordCode: new ResetPasswordCode({
                    code: '654321',
                    expiresAt: new Date(Date.now() + 60_000),
                }),
            })

        describe('deve aceitar nova senha válida', () => {
            it('6 caracteres (limite mínimo)', async () => {
                await expect(
                    makeUserWithCode().resetPassword('654321', 'Ab@1xy'),
                ).resolves.toBeUndefined()
            })

            it('7 caracteres (acima do limite mínimo)', async () => {
                await expect(
                    makeUserWithCode().resetPassword('654321', 'Ab@1xyz'),
                ).resolves.toBeUndefined()
            })

            it('99 caracteres (abaixo do limite máximo)', async () => {
                await expect(
                    makeUserWithCode().resetPassword('654321', 'A'.repeat(99)),
                ).resolves.toBeUndefined()
            })

            it('100 caracteres (limite máximo)', async () => {
                await expect(
                    makeUserWithCode().resetPassword('654321', 'A'.repeat(100)),
                ).resolves.toBeUndefined()
            })
        })

        describe('deve lançar erro com nova senha inválida', () => {
            it('5 caracteres (abaixo do mínimo)', async () => {
                await expect(
                    makeUserWithCode().resetPassword('654321', 'Ab@1x'),
                ).rejects.toThrow(
                    'Invalid password: min 6 chars, max 100 chars',
                )
            })

            it('101 caracteres (acima do máximo)', async () => {
                await expect(
                    makeUserWithCode().resetPassword('654321', 'A'.repeat(101)),
                ).rejects.toThrow(
                    'Invalid password: min 6 chars, max 100 chars',
                )
            })
        })
    })

    describe('Verificar email', () => {
        it('deve lançar erro quando o email já está verificado', async () => {
            const user = createUserData({
                email: 'user@example.com',
                passwordHash: 'hash',
                isEmailVerified: true,
            })

            await expect(user.verifyEmail('123456')).rejects.toThrow(
                EmailAlreadyVerifiedError,
            )
        })

        it('deve lançar erro quando não há código de verificação pendente', async () => {
            const user = createUserData({
                email: 'user@example.com',
                passwordHash: 'hash',
            })

            await expect(user.verifyEmail('123456')).rejects.toThrow(
                VerificationCodeExpiredError,
            )
        })

        it('deve lançar erro com código incorreto', async () => {
            const user = createUserData({
                email: 'user@example.com',
                passwordHash: 'hash',
                emailVerificationCode: new EmailVerificationCode({
                    code: '654321',
                    expiresAt: new Date(Date.now() + 60_000),
                }),
            })

            await expect(user.verifyEmail('000000')).rejects.toThrow(
                VerificationCodeInvalidError,
            )
        })

        it('deve lançar erro com código expirado', async () => {
            const user = createUserData({
                email: 'user@example.com',
                passwordHash: 'hash',
                emailVerificationCode: createExpiredVerificationCode(),
            })

            await expect(user.verifyEmail('654321')).rejects.toThrow(
                VerificationCodeExpiredError,
            )
        })

        it('deve verificar o email com sucesso', async () => {
            const user = createUserData({
                email: 'user@example.com',
                passwordHash: 'hash',
                emailVerificationCode: new EmailVerificationCode({
                    code: '654321',
                    expiresAt: new Date(Date.now() + 60_000),
                }),
            })

            await user.verifyEmail('654321')

            expect(user.getIsEmailVerified()).toBe(true)
            expect(user.getEmailVerificationCode()).toBeNull()
        })
    })
})
