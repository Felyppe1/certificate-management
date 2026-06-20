import { describe, expect, it, vi, beforeEach, Mock } from 'vitest'
import { VerifyEmailUseCase } from './verify-email-use-case'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { ISessionsRepository } from './interfaces/repository/isessions-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { EmailVerificationCodeNotFoundError } from '../domain/error/not-found-error/email-verification-code-not-found-error'
import { User, UserInput } from '../domain/user'
import { EmailVerificationCode } from '../domain/email-verification-code'

function createUser(overrides?: Partial<UserInput>): User {
    return new User({
        id: 'user-id',
        email: 'user@example.com',
        isEmailVerified: false,
        name: 'Test User',
        passwordHash: 'hash',
        credits: 300,
        externalAccounts: [],
        emailVerificationCode: new EmailVerificationCode({
            code: '123456',
            expiresAt: new Date(Date.now() + 60_000),
        }),
        resetPasswordCode: null,
        emailChangeCode: null,
        ...overrides,
    })
}

describe('VerifyEmailUseCase', () => {
    let usersRepository: {
        getByEmail: Mock<IUsersRepository['getByEmail']>
        update: Mock<IUsersRepository['update']>
    }
    let sessionsRepository: { save: Mock<ISessionsRepository['save']> }
    let transactionManagerStub: Pick<ITransactionManager, 'run'>

    let useCase: VerifyEmailUseCase

    beforeEach(() => {
        usersRepository = {
            getByEmail: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }
        sessionsRepository = { save: vi.fn() }
        transactionManagerStub = {
            run: async (fn: any) => fn(),
        }
        useCase = new VerifyEmailUseCase(
            usersRepository,
            sessionsRepository,
            transactionManagerStub,
        )
    })

    it('deve lançar erro se o usuário não for encontrado pelo email', async () => {
        await expect(
            useCase.execute({ email: 'nao@existe.com', code: '123456' }),
        ).rejects.toThrow(EmailVerificationCodeNotFoundError)
    })

    it('deve verificar email, criar sessão e retornar sessionToken no caminho feliz', async () => {
        const user = createUser()
        usersRepository.getByEmail.mockResolvedValue(user)
        const spy = vi.spyOn(user, 'verifyEmail')

        const result = await useCase.execute({
            email: 'user@example.com',
            code: '123456',
        })

        expect(spy).toHaveBeenCalledWith('123456')
        expect(usersRepository.update).toHaveBeenCalledWith(user)
        expect(sessionsRepository.save).toHaveBeenCalled()
        expect(result.sessionToken).toBeDefined()
    })
})
