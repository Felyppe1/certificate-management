import { describe, expect, it, vi, beforeEach, Mock } from 'vitest'
import { ValidateResetPasswordCodeUseCase } from './valida-reset-password-code-use-case'
import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
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

describe('ValidateResetPasswordCodeUseCase', () => {
    let usersRepository: { getByEmail: Mock<IUsersRepository['getByEmail']> }

    let useCase: ValidateResetPasswordCodeUseCase

    beforeEach(() => {
        usersRepository = { getByEmail: vi.fn().mockResolvedValue(null) }
        useCase = new ValidateResetPasswordCodeUseCase(usersRepository)
    })

    it('deve lançar erro se o usuário não for encontrado', async () => {
        await expect(
            useCase.execute({ email: 'nao@existe.com', code: '123456' }),
        ).rejects.toThrow(UserNotFoundError)
    })

    it('deve validar o código sem lançar erro no caminho feliz', async () => {
        const user = createUser()
        usersRepository.getByEmail.mockResolvedValue(user)
        const spy = vi.spyOn(user, 'validateResetPasswordCode')

        await expect(
            useCase.execute({ email: 'user@example.com', code: '123456' }),
        ).resolves.not.toThrow()

        expect(spy).toHaveBeenCalledWith('123456')
    })
})
