import { describe, expect, it, vi } from 'vitest'
import { DeleteAccountUseCase } from './delete-google-account-use-case'
import { User, UserInput } from '../domain/user'
import { ExternalAccount } from '../domain/external-account'
import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { IGoogleAuthGateway } from './interfaces/gateway/igoogle-auth-gateway'
import { UserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'

const REFRESH_TOKEN = 'google-refresh-token'

function createUser(overrides?: Partial<UserInput>): User {
    return new User({
        id: 'user-id',
        email: 'user@example.com',
        isEmailVerified: true,
        name: 'Test User',
        passwordHash: 'hash',
        credits: 300,
        externalAccounts: [],
        emailVerificationCode: null,
        resetPasswordCode: null,
        emailChangeCode: null,
        ...overrides,
    })
}

function createGoogleAccount() {
    return new ExternalAccount({
        provider: 'GOOGLE',
        providerUserId: 'google-id',
        email: 'user@example.com',
        accessToken: 'access-token',
        refreshToken: REFRESH_TOKEN,
        accessTokenExpiryDateTime: new Date(),
        refreshTokenExpiryDateTime: new Date(),
    })
}

describe('DeleteAccountUseCase', () => {
    it('deve lançar erro quando o usuário não é encontrado', async () => {
        const usersRepository: Pick<IUsersRepository, 'getById' | 'delete'> = {
            getById: vi.fn().mockResolvedValue(null),
            delete: vi.fn(),
        }
        const googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'revokeRefreshToken'
        > = { revokeRefreshToken: vi.fn() }

        const useCase = new DeleteAccountUseCase(
            usersRepository,
            googleAuthGateway,
        )

        await expect(
            useCase.execute({ userId: 'id-inexistente' }),
        ).rejects.toThrow(UserNotFoundError)

        expect(usersRepository.delete).not.toHaveBeenCalled()
        expect(googleAuthGateway.revokeRefreshToken).not.toHaveBeenCalled()
    })

    it('deve deletar conta sem revogar token quando não há conta Google', async () => {
        const user = createUser()
        const usersRepository: Pick<IUsersRepository, 'getById' | 'delete'> = {
            getById: vi.fn().mockResolvedValue(user),
            delete: vi.fn(),
        }
        const googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'revokeRefreshToken'
        > = { revokeRefreshToken: vi.fn() }

        const useCase = new DeleteAccountUseCase(
            usersRepository,
            googleAuthGateway,
        )

        await useCase.execute({ userId: user.getId() })

        expect(googleAuthGateway.revokeRefreshToken).not.toHaveBeenCalled()
        expect(usersRepository.delete).toHaveBeenCalledWith(user.getId())
    })

    it('deve revogar o token Google e deletar a conta', async () => {
        const user = createUser({
            externalAccounts: [createGoogleAccount()],
        })
        const usersRepository: Pick<IUsersRepository, 'getById' | 'delete'> = {
            getById: vi.fn().mockResolvedValue(user),
            delete: vi.fn(),
        }
        const googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'revokeRefreshToken'
        > = { revokeRefreshToken: vi.fn().mockResolvedValue(undefined) }

        const useCase = new DeleteAccountUseCase(
            usersRepository,
            googleAuthGateway,
        )

        await useCase.execute({ userId: user.getId() })

        expect(googleAuthGateway.revokeRefreshToken).toHaveBeenCalledWith(
            REFRESH_TOKEN,
        )
        expect(usersRepository.delete).toHaveBeenCalledWith(user.getId())
    })
})
