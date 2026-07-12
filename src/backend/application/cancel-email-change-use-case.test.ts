import { describe, expect, it, vi } from 'vitest'
import { CancelEmailChangeUseCase } from './cancel-email-change-use-case'
import { User, UserInput } from '../domain/user'
import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { EmailChangeCode } from '../domain/email-change-code'
import { UserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'

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

describe('CancelEmailChangeUseCase', () => {
    it('deve lançar erro quando o usuário não é encontrado', async () => {
        const usersRepository: Pick<IUsersRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }

        const useCase = new CancelEmailChangeUseCase(usersRepository)

        await expect(
            useCase.execute({ userId: 'id-inexistente' }),
        ).rejects.toThrow(UserNotFoundError)

        expect(usersRepository.update).not.toHaveBeenCalled()
    })

    it('deve cancelar a mudança de email com sucesso', async () => {
        const pendingCode = new EmailChangeCode({
            newEmail: 'new@example.com',
            code: '111111',
            expiresAt: new Date(Date.now() + 60_000),
        })
        const user = createUser({ emailChangeCode: pendingCode })
        const usersRepository: Pick<IUsersRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(user),
            update: vi.fn(),
        }

        const useCase = new CancelEmailChangeUseCase(usersRepository)

        await useCase.execute({ userId: user.getId() })

        expect(usersRepository.update).toHaveBeenCalledWith(user)
        expect(user.getEmailChangeCode()).toBeNull()
    })
})
