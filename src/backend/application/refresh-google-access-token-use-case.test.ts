import { describe, expect, it, vi, beforeEach } from 'vitest'
import { RefreshGoogleAccessTokenUseCase } from './refresh-google-access-token-use-case'
import { GoogleAccountNotFoundError } from '../domain/error/forbidden-error/google-account-not-found-error'

function createUserMock(overrides: Record<string, unknown> = {}) {
    return {
        getId: () => 'user-id',
        hasExternalAccount: vi.fn().mockReturnValue(true),
        getGoogleAccessToken: vi.fn().mockReturnValue('access-token'),
        getGoogleRefreshToken: vi.fn().mockReturnValue('refresh-token'),
        getGoogleAccessTokenExpiryDateTime: vi.fn().mockReturnValue(new Date()),
        updateExternalAccountTokens: vi.fn(),
        ...overrides,
    }
}

describe('RefreshGoogleAccessTokenUseCase', () => {
    const usersRepository = {
        getById: vi.fn(),
        update: vi.fn(),
    }

    const googleAuthGateway = {
        checkOrGetNewAccessToken: vi.fn(),
    }

    let useCase: RefreshGoogleAccessTokenUseCase

    beforeEach(() => {
        vi.clearAllMocks()
        useCase = new RefreshGoogleAccessTokenUseCase(usersRepository, googleAuthGateway)
    })

    it('deve lançar erro se o usuário não for encontrado', async () => {
        usersRepository.getById.mockResolvedValue(null)

        await expect(
            useCase.execute({ userId: 'invalido' }),
        ).rejects.toThrow(GoogleAccountNotFoundError)
    })

    it('deve lançar erro se o usuário não tiver conta Google', async () => {
        const user = createUserMock({ hasExternalAccount: vi.fn().mockReturnValue(false) })
        usersRepository.getById.mockResolvedValue(user)

        await expect(
            useCase.execute({ userId: 'user-id' }),
        ).rejects.toThrow(GoogleAccountNotFoundError)
    })

    it('deve retornar o token atual sem atualizar se ainda válido', async () => {
        const user = createUserMock()
        usersRepository.getById.mockResolvedValue(user)
        googleAuthGateway.checkOrGetNewAccessToken.mockResolvedValue(null)

        const result = await useCase.execute({ userId: 'user-id' })

        expect(result).toBe('access-token')
        expect(usersRepository.update).not.toHaveBeenCalled()
    })

    it('deve atualizar tokens e retornar novo access token quando expirado', async () => {
        const user = createUserMock()
        usersRepository.getById.mockResolvedValue(user)
        googleAuthGateway.checkOrGetNewAccessToken.mockResolvedValue({
            newAccessToken: 'novo-access-token',
            newAccessTokenExpiryDateTime: new Date(),
        })

        user.getGoogleAccessToken = vi.fn().mockReturnValue('novo-access-token')

        const result = await useCase.execute({ userId: 'user-id' })

        expect(user.updateExternalAccountTokens).toHaveBeenCalled()
        expect(usersRepository.update).toHaveBeenCalledWith(user)
        expect(result).toBe('novo-access-token')
    })
})