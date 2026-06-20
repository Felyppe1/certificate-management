import { beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import { FinishCertificateEmailSendingProcessUseCase } from './finish-certificate-email-sending-process-use-case'
import { IEmailsRepository } from './interfaces/repository/iemails-repository'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import {
    Email,
    EMAIL_ERROR_TYPE_ENUM,
    PROCESSING_STATUS_ENUM,
} from '../domain/email'
import { CertificateEmission, CERTIFICATE_STATUS } from '../domain/certificate'
import { EmailNotFoundError } from '../domain/error/not-found-error/email-not-found-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'

describe('FinishCertificateEmailSendingProcessUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'
    const EMAIL_ID = 'email-1'

    let transactionManagerStub: Pick<ITransactionManager, 'run'>

    function createEmail(overrides?: { status?: PROCESSING_STATUS_ENUM }) {
        return new Email({
            id: EMAIL_ID,
            certificateEmissionId: CERTIFICATE_ID,
            subject: 'Assunto',
            body: 'Corpo',
            emailColumn: 'Email',
            scheduledAt: null,
            status: overrides?.status ?? PROCESSING_STATUS_ENUM.RUNNING,
            emailErrorType: null,
        })
    }

    function createCertificateEmission(overrides?: {
        status?: CERTIFICATE_STATUS
    }) {
        return new CertificateEmission({
            id: CERTIFICATE_ID,
            name: 'Certificado',
            userId: USER_ID,
            template: null,
            dataSource: null,
            createdAt: new Date(),
            status: overrides?.status ?? CERTIFICATE_STATUS.EMITTED,
            variableColumnMapping: null,
        })
    }

    let emailsRepositoryMock: {
        getById: Mock<IEmailsRepository['getById']>
        update: Mock<IEmailsRepository['update']>
    }

    let certificatesRepositoryMock: {
        getById: Mock<ICertificatesRepository['getById']>
        update: Mock<ICertificatesRepository['update']>
    }

    let usersRepositoryMock: {
        upsertDailyUsage: Mock<IUsersRepository['upsertDailyUsage']>
    }

    beforeEach(() => {
        transactionManagerStub = {
            async run<T>(work: () => Promise<T>): Promise<T> {
                return work()
            },
        }

        emailsRepositoryMock = {
            getById: vi.fn().mockResolvedValue(createEmail()),
            update: vi.fn(),
        }

        certificatesRepositoryMock = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        usersRepositoryMock = {
            upsertDailyUsage: vi.fn(),
        }
    })

    it('deve finalizar o processo de envio de e-mails com sucesso', async () => {
        const email = createEmail()
        const certificateEmission = createCertificateEmission()

        emailsRepositoryMock.getById.mockResolvedValue(email)
        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const useCase = new FinishCertificateEmailSendingProcessUseCase(
            emailsRepositoryMock,
            certificatesRepositoryMock,
            usersRepositoryMock,
            transactionManagerStub,
        )

        await useCase.execute({
            emailId: EMAIL_ID,
            status: PROCESSING_STATUS_ENUM.COMPLETED,
            emailsSentCount: 2,
            userId: USER_ID,
        })

        expect(email.serialize().status).toBe(PROCESSING_STATUS_ENUM.COMPLETED)
        expect(emailsRepositoryMock.update).toHaveBeenCalledWith(email)
        expect(usersRepositoryMock.upsertDailyUsage).toHaveBeenCalledWith(
            USER_ID,
            { emailsSentCount: 2 },
        )
        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve marcar o certificado como gerado quando o processo de envio de e-mails falhar', async () => {
        const email = createEmail()
        const certificateEmission = createCertificateEmission()

        emailsRepositoryMock.getById.mockResolvedValue(email)
        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const useCase = new FinishCertificateEmailSendingProcessUseCase(
            emailsRepositoryMock,
            certificatesRepositoryMock,
            usersRepositoryMock,
            transactionManagerStub,
        )

        await useCase.execute({
            emailId: EMAIL_ID,
            status: PROCESSING_STATUS_ENUM.FAILED,
        })

        expect(email.serialize().status).toBe(PROCESSING_STATUS_ENUM.FAILED)
        expect(email.serialize().emailErrorType).toBe(
            EMAIL_ERROR_TYPE_ENUM.INTERNAL_ERROR,
        )
        expect(certificateEmission.serialize().status).toBe(
            CERTIFICATE_STATUS.GENERATED,
        )
        expect(certificatesRepositoryMock.update).toHaveBeenCalledWith(
            certificateEmission,
        )
        expect(emailsRepositoryMock.update).toHaveBeenCalledWith(email)
        expect(usersRepositoryMock.upsertDailyUsage).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o e-mail não for encontrado', async () => {
        emailsRepositoryMock.getById.mockResolvedValue(null)

        const useCase = new FinishCertificateEmailSendingProcessUseCase(
            emailsRepositoryMock,
            {} as ICertificatesRepository,
            {} as IUsersRepository,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                emailId: 'nao-existe',
                status: PROCESSING_STATUS_ENUM.COMPLETED,
            }),
        ).rejects.toThrow(EmailNotFoundError)
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(null)

        const useCase = new FinishCertificateEmailSendingProcessUseCase(
            emailsRepositoryMock,
            certificatesRepositoryMock,
            {} as IUsersRepository,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                emailId: EMAIL_ID,
                status: PROCESSING_STATUS_ENUM.COMPLETED,
            }),
        ).rejects.toThrow(CertificateNotFoundError)
    })
})
