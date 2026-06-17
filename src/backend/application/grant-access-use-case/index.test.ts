import { describe, expect, it, vi, beforeEach } from 'vitest'
import { GrantAccessUseCase } from './index'
import { NotAdminError } from '../../domain/error/forbidden-error/not-admin-error'
import { UserNotFoundError } from '../../domain/error/not-found-error/user-not-found-error'
import { INotificationGateway } from '../interfaces/inotification-gateway'
import { IUsersRepository } from '../interfaces/repository/iusers-repository'
import {
    buildHtml,
    buildHtmlRealCase,
    buildHtmlSimulation,
} from './email-template'

function createUserMock(email: string) {
    return {
        getEmail: () => email,
    }
}

describe('GrantAccessUseCase', () => {
    const notificationEmailGateway: Pick<INotificationGateway, 'sendEmail'> = {
        sendEmail: vi.fn(),
    }

    const usersRepository: Pick<IUsersRepository, 'getById'> = {
        getById: vi.fn(),
    }

    let useCase: GrantAccessUseCase

    beforeEach(() => {
        vi.clearAllMocks()
        useCase = new GrantAccessUseCase(
            notificationEmailGateway,
            usersRepository,
        )
    })

    it('deve lançar erro quando o usuário não for encontrado', async () => {
        vi.mocked(usersRepository.getById).mockResolvedValue(null)

        await expect(
            useCase.execute({ email: 'novo@example.com', userId: 'user-id' }),
        ).rejects.toThrow(UserNotFoundError)
    })

    it('deve lançar erro quando o usuário não for administrador', async () => {
        const nonAdminUser = createUserMock('comum@example.com')
        vi.mocked(usersRepository.getById).mockResolvedValue(
            nonAdminUser as any,
        )

        await expect(
            useCase.execute({ email: 'novo@example.com', userId: 'user-id' }),
        ).rejects.toThrow(NotAdminError)
    })

    it('deve enviar e-mail para o destinatário quando o usuário for administrador', async () => {
        const adminUser = createUserMock('felyppe.nunes1@gmail.com')
        vi.mocked(usersRepository.getById).mockResolvedValue(adminUser as any)

        await useCase.execute({ email: 'novo@example.com', userId: 'admin-id' })

        expect(notificationEmailGateway.sendEmail).toHaveBeenCalledOnce()
        expect(notificationEmailGateway.sendEmail).toHaveBeenCalledWith(
            'novo@example.com',
            expect.any(String),
            expect.any(String),
            buildHtml(),
        )
    })

    it('deve enviar e-mail de simulação quando o usuário veio do formulário e não tem um caso real', async () => {
        const adminUser = createUserMock('luizfelyppe@id.uff.br')
        vi.mocked(usersRepository.getById).mockResolvedValue(adminUser as any)

        await useCase.execute({
            email: 'novo@example.com',
            userId: 'admin-id',
            fromForm: true,
            isRealCase: false,
        })

        expect(notificationEmailGateway.sendEmail).toHaveBeenCalledOnce()
        expect(notificationEmailGateway.sendEmail).toHaveBeenCalledWith(
            'novo@example.com',
            expect.any(String),
            expect.any(String),
            buildHtmlSimulation(),
        )
    })

    it('deve enviar e-mail de caso real quando o usuário veio do formulário e tem um caso real', async () => {
        const adminUser = createUserMock('felyppe.nunes1@gmail.com')
        vi.mocked(usersRepository.getById).mockResolvedValue(adminUser as any)

        await useCase.execute({
            email: 'novo@example.com',
            userId: 'admin-id',
            fromForm: true,
            isRealCase: true,
        })

        expect(notificationEmailGateway.sendEmail).toHaveBeenCalledOnce()
        expect(notificationEmailGateway.sendEmail).toHaveBeenCalledWith(
            'novo@example.com',
            expect.any(String),
            expect.any(String),
            buildHtmlRealCase(),
        )
    })
})
