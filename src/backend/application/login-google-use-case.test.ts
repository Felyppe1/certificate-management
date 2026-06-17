import { describe, expect, it, vi, beforeEach } from 'vitest'
import { LoginGoogleUseCase } from './login-google-use-case'
import { UserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'
import { ExternalAccountAlreadyExistsError } from '../domain/error/conflict-error/external-account-already-exists-error'
import { InsufficientExternalAccountScopesError } from '../domain/error/authentication-error/insufficient-external-account-scopes-error'

function createUserMock(overrides: any = {}) {
    return {
        getId: () => 'user-1',
        hasExternalAccount: () => false,
        addExternalAccount: vi.fn(),
        updateExternalAccountTokens: vi.fn(),
        getGoogleRefreshToken: () => 'old-refresh',
        ...overrides,
    }
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
    const usersRepository = {
        save: vi.fn(),
        update: vi.fn(),
        getByEmail: vi.fn(),
        getById: vi.fn(),
        getByExternalAccount: vi.fn(),
    }

    const sessionsRepository = {
        save: vi.fn(),
    }

    const googleAuthGateway = {
        getToken: vi.fn(),
        getUserInfo: vi.fn(),
    }

    const transactionManager = {
        run: vi.fn(async (fn: any) => fn()),
    }

    let useCase: LoginGoogleUseCase

    beforeEach(() => {
        vi.clearAllMocks()

        googleAuthGateway.getToken.mockResolvedValue(createGoogleToken())

        googleAuthGateway.getUserInfo.mockResolvedValue(createGoogleUserInfo())

        useCase = new LoginGoogleUseCase(
            usersRepository as any,
            sessionsRepository as any,
            googleAuthGateway as any,
            transactionManager as any,
        )
    })

    it('deve lançar erro se usuário não existir no re-auth', async () => {
        usersRepository.getById.mockResolvedValue(null)

        await expect(
            useCase.execute({
                code: 'code',
                reAuthenticate: true,
                userId: 'invalid',
            }),
        ).rejects.toThrow(UserNotFoundError)
    })

    it('deve lançar conflito se conta Google já pertencer a outro usuário', async () => {
        const loggedUser = createUserMock()

        usersRepository.getById.mockResolvedValue(loggedUser)

        usersRepository.getByExternalAccount.mockResolvedValue({
            getId: () => 'user-2',
        })

        googleAuthGateway.getToken.mockResolvedValue(createGoogleToken())

        await expect(
            useCase.execute({
                code: 'code',
                reAuthenticate: true,
                userId: 'user-1',
            }),
        ).rejects.toThrow(ExternalAccountAlreadyExistsError)
    })

    it('deve criar novo usuário quando não existir', async () => {
        usersRepository.getByExternalAccount.mockResolvedValue(null)
        usersRepository.getByEmail.mockResolvedValue(null)

        const result = await useCase.execute({
            code: 'code',
            reAuthenticate: false,
        })

        expect(result.sessionToken).toBeDefined()
        expect(usersRepository.save).toHaveBeenCalled()
        expect(sessionsRepository.save).toHaveBeenCalled()
    })

    it('deve sugerir link de email se usuário existir sem Google', async () => {
        usersRepository.getByExternalAccount.mockResolvedValue(null)

        usersRepository.getByEmail.mockResolvedValue(
            createUserMock({
                hasExternalAccount: () => false,
            }),
        )

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
        const existingUser = createUserMock({
            hasExternalAccount: () => true,
        })

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
        const userMock = createUserMock({
            hasExternalAccount: () => false,
        })

        usersRepository.getById.mockResolvedValue(userMock)
        usersRepository.getByExternalAccount.mockResolvedValue(null)

        await useCase.execute({
            code: 'code',
            reAuthenticate: true,
            userId: 'user-1',
        })

        expect(userMock.addExternalAccount).toHaveBeenCalled()
    })

    it('deve atualizar conta Google no re-auth quando já existe', async () => {
        const userMock = createUserMock({
            hasExternalAccount: () => true,
        })

        usersRepository.getById.mockResolvedValue(userMock)
        usersRepository.getByExternalAccount.mockResolvedValue(null)

        googleAuthGateway.getToken.mockResolvedValue(
            createGoogleToken({ refreshToken: null }),
        )

        await useCase.execute({
            code: 'code',
            reAuthenticate: true,
            userId: 'user-1',
        })

        expect(userMock.updateExternalAccountTokens).toHaveBeenCalled()
    })

    it('deve sempre criar sessão', async () => {
        usersRepository.getByExternalAccount.mockResolvedValue(createUserMock())

        await useCase.execute({
            code: 'code',
            reAuthenticate: false,
        })

        expect(sessionsRepository.save).toHaveBeenCalled()
    })

    it('deve lançar erro se os escopos do Google forem insuficientes', async () => {
        googleAuthGateway.getToken.mockResolvedValue(
            createGoogleToken({ scopes: ['https://www.googleapis.com/auth/drive.file'] }),
        )

        await expect(
            useCase.execute({ code: 'code', reAuthenticate: false }),
        ).rejects.toThrow(InsufficientExternalAccountScopesError)
    })
})