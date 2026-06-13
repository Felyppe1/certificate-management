import { describe, expect, it, vi } from 'vitest'
import { CancelSystemLoginUseCase } from './cancel-system-login-use-case'
import { User, UserInput } from '../domain/user'
import { ExternalAccount } from '../domain/external-account'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { UserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'

function createUser(overrides?: Partial<UserInput>): User {
    return new User({
        id: 'user-id',
        email: 'user@example.com',
        isEmailVerified: true,
        name: 'Test User',
        passwordHash: 'hash',
        credits: 300,
        externalAccounts: [
            new ExternalAccount({
                provider: 'GOOGLE',
                providerUserId: 'google-id',
                email: 'user@example.com',
                accessToken: 'access-token',
                refreshToken: 'refresh-token',
                accessTokenExpiryDateTime: new Date(),
                refreshTokenExpiryDateTime: new Date(),
            }),
        ],
        emailVerificationCode: null,
        resetPasswordCode: null,
        emailChangeCode: null,
        ...overrides,
    })
}

describe('CancelSystemLoginUseCase', () => {
    it('deve lançar erro quando o usuário não é encontrado', async () => {
        const usersRepository: Pick<IUsersRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }

        const useCase = new CancelSystemLoginUseCase(usersRepository)

        await expect(
            useCase.execute({ userId: 'id-inexistente' }),
        ).rejects.toThrow(UserNotFoundError)

        expect(usersRepository.update).not.toHaveBeenCalled()
    })

    it('deve cancelar o login por email com sucesso', async () => {
        const user = createUser()
        const usersRepository: Pick<IUsersRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(user),
            update: vi.fn(),
        }

        const useCase = new CancelSystemLoginUseCase(usersRepository)

        await useCase.execute({ userId: user.getId() })

        expect(usersRepository.update).toHaveBeenCalledWith(user)
        expect(user.hasSystemLogin()).toBe(false)
        expect(user.getEmail()).toBeNull()
    })
})