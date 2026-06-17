import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AskForAccessUseCase } from './index'
import { INotificationGateway } from '../interfaces/inotification-gateway'
import { buildHtml } from './email-template'

describe('AskForAccessUseCase', () => {
    const notificationEmailGateway: Pick<INotificationGateway, 'sendEmail'> = {
        sendEmail: vi.fn(),
    }

    let useCase: AskForAccessUseCase

    beforeEach(() => {
        vi.clearAllMocks()
        useCase = new AskForAccessUseCase(notificationEmailGateway)
    })

    it('deve enviar e-mail com o endereço do solicitante no conteúdo do HTML', async () => {
        const applicantEmail = 'solicitante@example.com'

        await useCase.execute({ email: applicantEmail })

        expect(notificationEmailGateway.sendEmail).toHaveBeenCalledOnce()
        expect(notificationEmailGateway.sendEmail).toHaveBeenCalledWith(
            expect.any(String),
            expect.any(String),
            expect.any(String),
            buildHtml(applicantEmail),
        )
    })
})
