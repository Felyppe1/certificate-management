import { describe, expect, it, vi, beforeEach, Mock } from 'vitest'
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
    let usersRepositoryMock: {
        getById: Mock<IUsersRepository['getById']>
        update: Mock<IUsersRepository['update']>
    }
    let googleAuthGatewayStub: Pick<
        IGoogleAuthGateway,
        'checkOrGetNewAccessToken'
    >

    beforeEach(() => {
        usersRepositoryMock = {
            getById: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }
        googleAuthGatewayStub = {
            checkOrGetNewAccessToken: async () => null,
        }
    })

    it('deve lançar erro quando usuário não encontrado', async () => {
        usersRepositoryMock.getById.mockResolvedValue(null)

        const useCase = new RefreshGoogleAccessTokenUseCase(
            usersRepositoryMock,
            googleAuthGatewayStub as IGoogleAuthGateway,
        )

        await expect(
            useCase.execute({ userId: 'id-inexistente' }),
        ).rejects.toThrow(GoogleAccountNotFoundError)
    })

    it('deve lançar erro quando usuário não tem conta Google', async () => {
        const user = createUser({ externalAccounts: [] })
        usersRepositoryMock.getById.mockResolvedValue(user)

        const useCase = new RefreshGoogleAccessTokenUseCase(
            usersRepositoryMock,
            googleAuthGatewayStub as IGoogleAuthGateway,
        )

        await expect(useCase.execute({ userId: 'user-id' })).rejects.toThrow(
            GoogleAccountNotFoundError,
        )
    })

    it('deve retornar o token atual sem chamar update quando token ainda é válido', async () => {
        const user = createUser()
        usersRepositoryMock.getById.mockResolvedValue(user)
        googleAuthGatewayStub.checkOrGetNewAccessToken = async () => null

        const useCase = new RefreshGoogleAccessTokenUseCase(
            usersRepositoryMock,
            googleAuthGatewayStub as IGoogleAuthGateway,
        )

        const token = await useCase.execute({ userId: 'user-id' })

        expect(token).toBe('current-access-token')
        expect(usersRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve atualizar e persistir o novo token quando o token expirou', async () => {
        const user = createUser()
        usersRepositoryMock.getById.mockResolvedValue(user)
        const newExpiryDate = new Date(Date.now() + 3600_000)
        googleAuthGatewayStub.checkOrGetNewAccessToken = async () => ({
            newAccessToken: 'new-access-token',
            newAccessTokenExpiryDateTime: newExpiryDate,
        })

        const useCase = new RefreshGoogleAccessTokenUseCase(
            usersRepositoryMock,
            googleAuthGatewayStub as IGoogleAuthGateway,
        )

        const token = await useCase.execute({ userId: 'user-id' })

        expect(token).toBe('new-access-token')
        expect(usersRepositoryMock.update).toHaveBeenCalledOnce()
        expect(user.getGoogleAccessToken()).toBe('new-access-token')
    })
})
