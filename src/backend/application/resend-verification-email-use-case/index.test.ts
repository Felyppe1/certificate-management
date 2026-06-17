import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ResendVerificationEmailUseCase } from './index'
import { UserNotFoundError } from '../../domain/error/authentication-error/user-not-found-error'
import { SystemLoginNotEnabledError } from '../../domain/error/validation-error/system-login-not-enabled-error'
import { EmailAlreadyVerifiedError } from '../../domain/error/validation-error/email-already-verified-error'
import { IUsersRepository } from '../interfaces/repository/iusers-repository'
import { INotificationGateway } from '../interfaces/inotification-gateway'

function createUserMock(overrides: Record<string, unknown> = {}) {
    return {
        hasSystemLogin: vi.fn().mockReturnValue(true),
        getIsEmailVerified: vi.fn().mockReturnValue(false),
        generateEmailVerificationCode: vi.fn(),
        getEmailVerificationCode: vi.fn().mockReturnValue('VERIFY123'),
        ...overrides,
    }
}

describe('ResendVerificationEmailUseCase', () => {
    const usersRepository: Pick<IUsersRepository, 'getByEmail' | 'update'> = {
        getByEmail: vi.fn(),
        update: vi.fn(),
    }

    const notificationGateway: Pick<INotificationGateway, 'sendEmail'> = {
        sendEmail: vi.fn(),
    }

    let useCase: ResendVerificationEmailUseCase

    beforeEach(() => {
        vi.clearAllMocks()
        useCase = new ResendVerificationEmailUseCase(
            usersRepository,
            notificationGateway,
        )
    })

    it('deve lançar erro quando o usuário não for encontrado', async () => {
        vi.mocked(usersRepository.getByEmail).mockResolvedValue(null)

        await expect(
            useCase.execute({ email: 'naoexiste@example.com' }),
        ).rejects.toThrow(UserNotFoundError)
    })

    it('deve lançar erro quando o login de sistema não estiver ativo', async () => {
        const user = createUserMock({
            hasSystemLogin: vi.fn().mockReturnValue(false),
        })
        vi.mocked(usersRepository.getByEmail).mockResolvedValue(user as any)

        await expect(
            useCase.execute({ email: 'user@example.com' }),
        ).rejects.toThrow(SystemLoginNotEnabledError)
    })

    it('deve lançar erro quando o e-mail já estiver verificado', async () => {
        const user = createUserMock({
            getIsEmailVerified: vi.fn().mockReturnValue(true),
        })
        vi.mocked(usersRepository.getByEmail).mockResolvedValue(user as any)

        await expect(
            useCase.execute({ email: 'user@example.com' }),
        ).rejects.toThrow(EmailAlreadyVerifiedError)
    })

    it('deve gerar novo código e enviar e-mail de verificação no caminho feliz', async () => {
        const user = createUserMock()
        vi.mocked(usersRepository.getByEmail).mockResolvedValue(user as any)
        vi.mocked(usersRepository.update).mockResolvedValue(undefined)

        await useCase.execute({ email: 'user@example.com' })

        expect(user.generateEmailVerificationCode).toHaveBeenCalledOnce()
        expect(usersRepository.update).toHaveBeenCalledWith(user)
        expect(notificationGateway.sendEmail).toHaveBeenCalledOnce()
        expect(notificationGateway.sendEmail).toHaveBeenCalledWith(
            'user@example.com',
            expect.any(String),
            expect.any(String),
            expect.stringContaining('VERIFY123'),
        )
    })
})
