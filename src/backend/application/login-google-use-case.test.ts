import { describe, expect, it, vi, beforeEach } from 'vitest'
import { LoginGoogleUseCase } from './login-google-use-case'
import { AuthenticationError } from '../domain/error/authentication-error'
import { ConflictError } from '../domain/error/conflict-error'

function createUserMock(overrides: any = {}) {
    return {
        getId: () => 'user-1',
        hasGoogleAccount: () => false,
        addExternalAccount: vi.fn(),
        updateExternalAccount: vi.fn(),
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
        ).rejects.toThrow(AuthenticationError)
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
        ).rejects.toThrow(ConflictError)
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
                hasGoogleAccount: () => false,
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
            hasGoogleAccount: () => true,
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
            hasGoogleAccount: () => false,
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
            hasGoogleAccount: () => true,
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

        expect(userMock.updateExternalAccount).toHaveBeenCalled()
    })

    it('deve sempre criar sessão', async () => {
        usersRepository.getByExternalAccount.mockResolvedValue(createUserMock())

        await useCase.execute({
            code: 'code',
            reAuthenticate: false,
        })

        expect(sessionsRepository.save).toHaveBeenCalled()
    })
})
