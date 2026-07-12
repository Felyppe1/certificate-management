import { describe, expect, it, vi } from 'vitest'
import { ConfirmEmailChangeUseCase } from './confirm-email-change-use-case'
import { User, UserInput } from '../domain/user'
import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { EmailChangeCode } from '../domain/email-change-code'
import { UserNotFoundError } from '../domain/error/authentication-error/user-not-found-error'
import { EmailUnavailableError } from '../domain/error/conflict-error/email-unavailable-error'
import { EmailChangeCodeInvalidError } from '../domain/error/forbidden-error/email-change-code-invalid-error'

const VALID_CODE = '111111'
const NEW_EMAIL = 'new@example.com'

function createValidEmailChangeCode() {
    return new EmailChangeCode({
        newEmail: NEW_EMAIL,
        code: VALID_CODE,
        expiresAt: new Date(Date.now() + 60_000),
    })
}

function createUser(overrides?: Partial<UserInput>): User {
    return new User({
        id: 'user-id',
        email: 'old@example.com',
        isEmailVerified: true,
        name: 'Test User',
        passwordHash: 'hash',
        credits: 300,
        externalAccounts: [],
        emailVerificationCode: null,
        resetPasswordCode: null,
        emailChangeCode: createValidEmailChangeCode(),
        ...overrides,
    })
}

describe('ConfirmEmailChangeUseCase', () => {
    it('deve lançar erro quando o usuário não é encontrado', async () => {
        const usersRepository: Pick<
            IUsersRepository,
            'getById' | 'getByEmail' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(null),
            getByEmail: vi.fn(),
            update: vi.fn(),
        }

        const useCase = new ConfirmEmailChangeUseCase(usersRepository)

        await expect(
            useCase.execute({ userId: 'id-inexistente', code: VALID_CODE }),
        ).rejects.toThrow(UserNotFoundError)

        expect(usersRepository.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o novo email já pertence a outro usuário', async () => {
        const user = createUser()
        const otherUser = createUser({ id: 'outro-user-id' })
        const usersRepository: Pick<
            IUsersRepository,
            'getById' | 'getByEmail' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(user),
            getByEmail: vi.fn().mockResolvedValue(otherUser),
            update: vi.fn(),
        }

        const useCase = new ConfirmEmailChangeUseCase(usersRepository)

        await expect(
            useCase.execute({ userId: user.getId(), code: VALID_CODE }),
        ).rejects.toThrow(EmailUnavailableError)

        expect(usersRepository.update).not.toHaveBeenCalled()
    })

    it('deve confirmar quando o email pertence ao mesmo usuário', async () => {
        const user = createUser()
        const usersRepository: Pick<
            IUsersRepository,
            'getById' | 'getByEmail' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(user),
            getByEmail: vi.fn().mockResolvedValue(user),
            update: vi.fn(),
        }

        const useCase = new ConfirmEmailChangeUseCase(usersRepository)

        await expect(
            useCase.execute({ userId: user.getId(), code: VALID_CODE }),
        ).resolves.not.toThrow()

        expect(usersRepository.update).toHaveBeenCalledWith(user)
        expect(user.getEmail()).toBe(NEW_EMAIL)
    })

    it('deve lançar erro quando o código é incorreto', async () => {
        const user = createUser()
        const usersRepository: Pick<
            IUsersRepository,
            'getById' | 'getByEmail' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(user),
            getByEmail: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }

        const useCase = new ConfirmEmailChangeUseCase(usersRepository)

        await expect(
            useCase.execute({ userId: user.getId(), code: '000000' }),
        ).rejects.toThrow(EmailChangeCodeInvalidError)

        expect(usersRepository.update).not.toHaveBeenCalled()
    })

    it('deve confirmar a mudança de email com sucesso', async () => {
        const user = createUser()
        const usersRepository: Pick<
            IUsersRepository,
            'getById' | 'getByEmail' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(user),
            getByEmail: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }

        const useCase = new ConfirmEmailChangeUseCase(usersRepository)

        const result = await useCase.execute({
            userId: user.getId(),
            code: VALID_CODE,
        })

        expect(result.newEmail).toBe(NEW_EMAIL)
        expect(usersRepository.update).toHaveBeenCalledWith(user)
    })
})
