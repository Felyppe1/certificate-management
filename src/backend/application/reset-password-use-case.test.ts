import { describe, expect, it, vi, beforeEach, Mock } from 'vitest'
import { ResetPasswordUseCase } from './reset-password-use-case'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { UserNotFoundError } from '../domain/error/not-found-error/user-not-found-error'
import { User, UserInput } from '../domain/user'
import { ResetPasswordCode } from '../domain/reset-password-code'

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
        resetPasswordCode: new ResetPasswordCode({
            code: '123456',
            expiresAt: new Date(Date.now() + 60_000),
        }),
        emailChangeCode: null,
        ...overrides,
    })
}

describe('ResetPasswordUseCase', () => {
    let usersRepository: {
        getByEmail: Mock<IUsersRepository['getByEmail']>
        update: Mock<IUsersRepository['update']>
    }

    let useCase: ResetPasswordUseCase

    beforeEach(() => {
        usersRepository = {
            getByEmail: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }
        useCase = new ResetPasswordUseCase(usersRepository)
    })

    it('deve lançar erro se o usuário não for encontrado', async () => {
        await expect(
            useCase.execute({
                email: 'nao@existe.com',
                code: '123456',
                newPassword: 'nova-senha',
            }),
        ).rejects.toThrow(UserNotFoundError)
    })

    it('deve redefinir senha e persistir usuário no caminho feliz', async () => {
        const user = createUser()
        usersRepository.getByEmail.mockResolvedValue(user)
        const spy = vi.spyOn(user, 'resetPassword')

        await useCase.execute({
            email: 'user@example.com',
            code: '123456',
            newPassword: 'nova-senha',
        })

        expect(spy).toHaveBeenCalledWith('123456', 'nova-senha')
        expect(usersRepository.update).toHaveBeenCalledWith(user)
    })
})
