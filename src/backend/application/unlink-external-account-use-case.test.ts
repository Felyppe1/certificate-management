import { describe, expect, it, vi } from 'vitest'
import { RefreshGoogleAccessTokenUseCase } from './refresh-google-access-token-use-case'
import { User, UserInput } from '../domain/user'
import { ExternalAccount } from '../domain/external-account'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { GoogleAccountNotFoundError } from '../domain/error/forbidden-error/google-account-not-found-error'

function createGoogleAccount() {
    return new ExternalAccount({
        provider: 'GOOGLE',
        providerUserId: 'google-id',
        email: 'user@example.com',
        accessToken: 'current-access-token',
        refreshToken: 'refresh-token',
        accessTokenExpiryDateTime: new Date(),
        refreshTokenExpiryDateTime: new Date(),
    })
}

function createUser(overrides?: Partial<UserInput>): User {
    return new User({
        id: 'user-id',
        email: 'user@example.com',
        isEmailVerified: true,
        name: 'Test User',
        passwordHash: 'hash',
        credits: 300,
        externalAccounts: [createGoogleAccount()],
        emailVerificationCode: null,
        resetPasswordCode: null,
        emailChangeCode: null,
        ...overrides,
    })
}

describe('RefreshGoogleAccessTokenUseCase', () => {
    it('deve lançar erro quando usuário não encontrado', async () => {
        const usersRepository: Pick<IUsersRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }
        const googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        > = { checkOrGetNewAccessToken: vi.fn() }

        const useCase = new RefreshGoogleAccessTokenUseCase(
            usersRepository,
            googleAuthGateway as IGoogleAuthGateway,
        )

        await expect(
            useCase.execute({ userId: 'id-inexistente' }),
        ).rejects.toThrow(GoogleAccountNotFoundError)
    })

    it('deve lançar erro quando usuário não tem conta Google', async () => {
        const user = createUser({ externalAccounts: [] })
        const usersRepository: Pick<IUsersRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(user),
            update: vi.fn(),
        }
        const googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        > = { checkOrGetNewAccessToken: vi.fn() }

        const useCase = new RefreshGoogleAccessTokenUseCase(
            usersRepository,
            googleAuthGateway as IGoogleAuthGateway,
        )

        await expect(
            useCase.execute({ userId: 'user-id' }),
        ).rejects.toThrow(GoogleAccountNotFoundError)
    })

    it('deve retornar o token atual sem chamar update quando token ainda é válido', async () => {
        const user = createUser()
        const usersRepository: Pick<IUsersRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(user),
            update: vi.fn(),
        }
        const googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        > = { checkOrGetNewAccessToken: vi.fn().mockResolvedValue(null) }

        const useCase = new RefreshGoogleAccessTokenUseCase(
            usersRepository,
            googleAuthGateway as IGoogleAuthGateway,
        )

        const token = await useCase.execute({ userId: 'user-id' })

        expect(token).toBe('current-access-token')
        expect(usersRepository.update).not.toHaveBeenCalled()
    })

    it('deve atualizar e persistir o novo token quando o token expirou', async () => {
        const user = createUser()
        const usersRepository: Pick<IUsersRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(user),
            update: vi.fn(),
        }
        const newExpiryDate = new Date(Date.now() + 3600_000)
        const googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        > = {
            checkOrGetNewAccessToken: vi.fn().mockResolvedValue({
                newAccessToken: 'new-access-token',
                newAccessTokenExpiryDateTime: newExpiryDate,
            }),
        }

        const useCase = new RefreshGoogleAccessTokenUseCase(
            usersRepository,
            googleAuthGateway as IGoogleAuthGateway,
        )

        const token = await useCase.execute({ userId: 'user-id' })

        expect(token).toBe('new-access-token')
        expect(usersRepository.update).toHaveBeenCalledOnce()
        expect(user.getGoogleAccessToken()).toBe('new-access-token')
    })
})