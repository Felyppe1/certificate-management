import { describe, expect, it, vi, beforeEach, Mock } from 'vitest'
import { LoginGoogleUseCase } from './login-google-use-case'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { ISessionsRepository } from './interfaces/repository/isessions-repository'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { UserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'
import { ExternalAccountAlreadyExistsError } from '../domain/error/conflict-error/external-account-already-exists-error'
import { InsufficientExternalAccountScopesError } from '../domain/error/authentication-error/insufficient-external-account-scopes-error'
import { User, UserInput } from '../domain/user'
import { ExternalAccount } from '../domain/external-account'

function createUser(overrides?: Partial<UserInput>): User {
    return new User({
        id: 'user-1',
        email: null,
        isEmailVerified: false,
        name: 'User',
        passwordHash: null,
        credits: 300,
        externalAccounts: [],
        emailVerificationCode: null,
        resetPasswordCode: null,
        emailChangeCode: null,
        ...overrides,
    })
}

function createGoogleUser(overrides?: Partial<UserInput>): User {
    return new User({
        id: 'user-1',
        email: null,
        isEmailVerified: false,
        name: 'User',
        passwordHash: null,
        credits: 300,
        externalAccounts: [
            new ExternalAccount({
                provider: 'GOOGLE',
                providerUserId: 'google-123',
                email: 'test@test.com',
                accessToken: 'access',
                refreshToken: 'old-refresh',
                accessTokenExpiryDateTime: new Date(),
                refreshTokenExpiryDateTime: null,
            }),
        ],
        emailVerificationCode: null,
        resetPasswordCode: null,
        emailChangeCode: null,
        ...overrides,
    })
}

function createGoogleToken(overrides: any = {}) {
    return {
        accessToken: 'access',
        refreshToken: 'refresh',
        idToken: 'id',
        scopes: [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/drive.readonly',
        ],
        accessTokenExpiryDateTime: new Date(),
        ...overrides,
    }
}

function createGoogleUserInfo(overrides: any = {}) {
    return {
        providerUserId: 'google-123',
        email: 'test@test.com',
        name: 'User',
        ...overrides,
    }
}

describe('LoginGoogleUseCase', () => {
    let usersRepository: {
        save: Mock<IUsersRepository['save']>
        update: Mock<IUsersRepository['update']>
        getByEmail: Mock<IUsersRepository['getByEmail']>
        getById: Mock<IUsersRepository['getById']>
        getByExternalAccount: Mock<IUsersRepository['getByExternalAccount']>
    }
    let sessionsRepository: { save: Mock<ISessionsRepository['save']> }
    let googleAuthGateway: {
        getToken: Mock<IGoogleAuthGateway['getToken']>
        getUserInfo: Mock<IGoogleAuthGateway['getUserInfo']>
    }

    const transactionManagerStub = {
        async run(fn: any) {
            return fn()
        },
    }

    let useCase: LoginGoogleUseCase

    beforeEach(() => {
        usersRepository = {
            save: vi.fn(),
            update: vi.fn(),
            getByEmail: vi.fn().mockResolvedValue(null),
            getById: vi.fn().mockResolvedValue(null),
            getByExternalAccount: vi.fn().mockResolvedValue(null),
        }
        sessionsRepository = { save: vi.fn() }
        googleAuthGateway = {
            getToken: vi.fn().mockResolvedValue(createGoogleToken()),
            getUserInfo: vi.fn().mockResolvedValue(createGoogleUserInfo()),
        }

        useCase = new LoginGoogleUseCase(
            usersRepository as any,
            sessionsRepository as any,
            googleAuthGateway as any,
            transactionManagerStub as any,
        )
    })

    it('deve lançar erro se usuário não existir no re-auth', async () => {
        await expect(
            useCase.execute({
                code: 'code',
                reAuthenticate: true,
                userId: 'invalid',
            }),
        ).rejects.toThrow(UserNotFoundError)
    })

    it('deve lançar conflito se conta Google já pertencer a outro usuário', async () => {
        const loggedUser = createUser()
        usersRepository.getById.mockResolvedValue(loggedUser)
        usersRepository.getByExternalAccount.mockResolvedValue(
            createUser({ id: 'user-2' }),
        )

        await expect(
            useCase.execute({
                code: 'code',
                reAuthenticate: true,
                userId: 'user-1',
            }),
        ).rejects.toThrow(ExternalAccountAlreadyExistsError)
    })

    it('deve criar novo usuário quando não existir', async () => {
        const result = await useCase.execute({
            code: 'code',
            reAuthenticate: false,
        })

        expect(result.sessionToken).toBeDefined()
        expect(usersRepository.save).toHaveBeenCalled()
        expect(sessionsRepository.save).toHaveBeenCalled()
    })

    it('deve sugerir link de email se usuário existir sem Google', async () => {
        usersRepository.getByEmail.mockResolvedValue(createUser())
        googleAuthGateway.getUserInfo.mockResolvedValue(
            createGoogleUserInfo({
                email: 'existente@test.com',
            }),
        )

        const result = await useCase.execute({
            code: 'code',
            reAuthenticate: false,
        })

        expect(result.suggestLinkingEmail).toBe('existente@test.com')
    })

    it('deve atualizar usuário existente com Google (login)', async () => {
        const existingUser = createGoogleUser()
        usersRepository.getByExternalAccount.mockResolvedValue(existingUser)
        googleAuthGateway.getToken.mockResolvedValue(
            createGoogleToken({ refreshToken: null }),
        )

        const result = await useCase.execute({
            code: 'code',
            reAuthenticate: false,
        })

        expect(result.sessionToken).toBeDefined()
        expect(usersRepository.update).toHaveBeenCalled()
    })

    it('deve adicionar conta Google no re-auth quando usuário não tem', async () => {
        const user = createUser()
        usersRepository.getById.mockResolvedValue(user)
        const spy = vi.spyOn(user, 'addExternalAccount')

        await useCase.execute({
            code: 'code',
            reAuthenticate: true,
            userId: 'user-1',
        })

        expect(spy).toHaveBeenCalled()
    })

    it('deve atualizar conta Google no re-auth quando já existe', async () => {
        const user = createGoogleUser()
        usersRepository.getById.mockResolvedValue(user)
        googleAuthGateway.getToken.mockResolvedValue(
            createGoogleToken({ refreshToken: null }),
        )
        const spy = vi.spyOn(user, 'updateExternalAccountTokens')

        await useCase.execute({
            code: 'code',
            reAuthenticate: true,
            userId: 'user-1',
        })

        expect(spy).toHaveBeenCalled()
    })

    it('deve sempre criar sessão', async () => {
        usersRepository.getByExternalAccount.mockResolvedValue(
            createGoogleUser(),
        )

        await useCase.execute({
            code: 'code',
            reAuthenticate: false,
        })

        expect(sessionsRepository.save).toHaveBeenCalled()
    })

    it('deve lançar erro se os escopos do Google forem insuficientes', async () => {
        googleAuthGateway.getToken.mockResolvedValue(
            createGoogleToken({
                scopes: ['https://www.googleapis.com/auth/drive.file'],
            }),
        )

        await expect(
            useCase.execute({ code: 'code', reAuthenticate: false }),
        ).rejects.toThrow(InsufficientExternalAccountScopesError)
    })
})
