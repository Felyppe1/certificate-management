import { describe, expect, it, vi, beforeEach } from 'vitest'
import { SetSystemLoginUseCase } from './index'
import { UserNotFoundError } from '../../domain/error/authentication-error/user-not-found-error'
import { EmailUnavailableError } from '../../domain/error/conflict-error/email-unavailable-error'

function createUserMock(overrides: Record<string, unknown> = {}) {
    return {
        getId: () => 'user-id',
        setSystemLogin: vi.fn().mockResolvedValue(undefined),
        getEmailVerificationCode: vi.fn().mockReturnValue('123456'),
        ...overrides,
    }
}

describe('SetSystemLoginUseCase', () => {
    const usersRepository = {
        getById: vi.fn(),
        getByEmail: vi.fn(),
        update: vi.fn(),
    }

    const notificationGateway = {
        sendEmail: vi.fn(),
    }

    let useCase: SetSystemLoginUseCase

    beforeEach(() => {
        vi.clearAllMocks()
        useCase = new SetSystemLoginUseCase(usersRepository, notificationGateway)
    })

    it('deve lançar erro se o usuário não for encontrado', async () => {
        usersRepository.getById.mockResolvedValue(null)

        await expect(
            useCase.execute({ userId: 'invalido', email: 'a@b.com', passwordPlain: 'senha' }),
        ).rejects.toThrow(UserNotFoundError)
    })

    it('deve lançar erro se o email já pertencer a outro usuário', async () => {
        const user = createUserMock()
        const outroUsuario = { getId: () => 'outro-user-id' }
        usersRepository.getById.mockResolvedValue(user)
        usersRepository.getByEmail.mockResolvedValue(outroUsuario)

        await expect(
            useCase.execute({ userId: 'user-id', email: 'ocupado@b.com', passwordPlain: 'senha' }),
        ).rejects.toThrow(EmailUnavailableError)
    })

    it('deve permitir usar email do próprio usuário', async () => {
        const user = createUserMock()
        usersRepository.getById.mockResolvedValue(user)
        usersRepository.getByEmail.mockResolvedValue(user)

        await expect(
            useCase.execute({ userId: 'user-id', email: 'user@b.com', passwordPlain: 'senha' }),
        ).resolves.not.toThrow()
    })

    it('deve enviar email de verificação quando o código existe após setSystemLogin', async () => {
        const user = createUserMock({
            getEmailVerificationCode: vi.fn().mockReturnValue('654321'),
        })
        usersRepository.getById.mockResolvedValue(user)
        usersRepository.getByEmail.mockResolvedValue(null)

        await useCase.execute({ userId: 'user-id', email: 'novo@b.com', passwordPlain: 'senha' })

        expect(notificationGateway.sendEmail).toHaveBeenCalledWith(
            'novo@b.com',
            expect.any(String),
            expect.any(String),
            expect.stringContaining('654321'),
        )
    })

    it('não deve enviar email de verificação quando código é null (email da conta Google)', async () => {
        const user = createUserMock({
            getEmailVerificationCode: vi.fn().mockReturnValue(null),
        })
        usersRepository.getById.mockResolvedValue(user)
        usersRepository.getByEmail.mockResolvedValue(null)

        await useCase.execute({ userId: 'user-id', email: 'google@gmail.com', passwordPlain: 'senha' })

        expect(notificationGateway.sendEmail).not.toHaveBeenCalled()
    })
})