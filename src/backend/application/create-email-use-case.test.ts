import { beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import { CreateEmailUseCase } from './create-email-use-case'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsReadRepository } from './interfaces/repository/idata-source-rows-read-repository'
import { IEmailsRepository } from './interfaces/repository/iemails-repository'
import { IQueue } from './interfaces/cloud/iqueue'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { DataSource, DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { DataSourceNotFoundError } from '../domain/error/not-found-error/data-source-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { NoDataSourceRowsError } from '../domain/error/validation-error/no-data-source-rows-error'
import { UnexistentDataSourceColumnError } from '../domain/error/validation-error/unexistent-data-source-column-error'
import { InvalidRecipientEmailError } from '../domain/error/validation-error/invalid-recipient-email-error'

describe('CreateEmailUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'

    function createDataSource() {
        return new DataSource({
            files: [
                {
                    fileName: 'dados.csv',
                    storageFileUrl: 'https://storage/dados.csv',
                    driveFileId: null,
                },
            ],
            inputMethod: INPUT_METHOD.UPLOAD,
            fileMimeType: DATA_SOURCE_MIME_TYPE.CSV,
            thumbnailUrl: null,
            columnsRow: 1,
            dataRowStart: 2,
            columns: [
                { name: 'Email', type: 'string' as const, arrayMetadata: null },
            ],
            googleAccountEmail: null,
        })
    }

    function createCertificateEmission(overrides?: {
        userId?: string
        status?: CERTIFICATE_STATUS
        dataSource?: DataSource | null
    }) {
        return new CertificateEmission({
            id: CERTIFICATE_ID,
            name: 'Meu Certificado',
            userId: overrides?.userId ?? USER_ID,
            template: null,
            createdAt: new Date(),
            status: overrides?.status ?? CERTIFICATE_STATUS.DRAFT,
            dataSource:
                overrides?.dataSource !== undefined
                    ? overrides.dataSource
                    : createDataSource(),
            variableColumnMapping: null,
        })
    }

    function createRow(id: string, email: string) {
        return { id, data: { Email: email } }
    }

    const BASE_INPUT = {
        userId: USER_ID,
        certificateEmissionId: CERTIFICATE_ID,
        subject: 'Seu Certificado',
        body: 'Olá, veja seu certificado.',
        emailColumn: 'Email',
        scheduledAt: null as Date | null,
    }

    let certificatesRepositoryMock: {
        getById: Mock<ICertificatesRepository['getById']>
        update: Mock<ICertificatesRepository['update']>
    }

    let dataSourceRowsReadRepositoryStub: Pick<
        IDataSourceRowsReadRepository,
        'countByCertificateEmissionId' | 'getManyByCertificateEmissionId'
    >

    let emailsRepositoryMock: {
        save: Mock<IEmailsRepository['save']>
    }

    let queueMock: {
        enqueueSendCertificateEmails: Mock<
            IQueue['enqueueSendCertificateEmails']
        >
    }

    let transactionManagerStub: Pick<ITransactionManager, 'run'>

    beforeEach(() => {
        certificatesRepositoryMock = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }
        dataSourceRowsReadRepositoryStub = {
            async countByCertificateEmissionId() {
                return 1
            },
            async getManyByCertificateEmissionId() {
                return {
                    data: [createRow('r1', 'a@exemplo.com')],
                    nextCursor: null,
                }
            },
        }
        emailsRepositoryMock = {
            save: vi.fn(),
        }
        queueMock = {
            enqueueSendCertificateEmails: vi.fn(),
        }
        transactionManagerStub = {
            async run<T>(work: () => Promise<T>): Promise<T> {
                return work()
            },
        }
    })

    function createUseCase() {
        return new CreateEmailUseCase(
            certificatesRepositoryMock,
            dataSourceRowsReadRepositoryStub,
            emailsRepositoryMock,
            queueMock,
            transactionManagerStub,
        )
    }

    it('deve criar o e-mail e enfileirar o envio imediato com sucesso', async () => {
        const certificateEmission = createCertificateEmission()
        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )
        dataSourceRowsReadRepositoryStub.countByCertificateEmissionId =
            async () => 2
        dataSourceRowsReadRepositoryStub.getManyByCertificateEmissionId =
            async () => ({
                data: [
                    createRow('r1', 'a@exemplo.com'),
                    createRow('r2', 'b@exemplo.com'),
                ],
                nextCursor: null,
            })

        await createUseCase().execute({ ...BASE_INPUT, scheduledAt: null })

        expect(queueMock.enqueueSendCertificateEmails).toHaveBeenCalledTimes(1)
        expect(queueMock.enqueueSendCertificateEmails).toHaveBeenCalledWith(
            expect.objectContaining({
                certificateEmissionId: CERTIFICATE_ID,
                userId: USER_ID,
                recipients: [
                    { rowId: 'r1', email: 'a@exemplo.com' },
                    { rowId: 'r2', email: 'b@exemplo.com' },
                ],
            }),
        )
        expect(certificateEmission.isEmitted()).toBe(true)
        expect(emailsRepositoryMock.save).toHaveBeenCalledTimes(1)
        expect(certificatesRepositoryMock.update).toHaveBeenCalledWith(
            certificateEmission,
        )
    })

    it('deve criar o e-mail e agendar o envio com sucesso', async () => {
        const certificateEmission = createCertificateEmission()
        certificatesRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        const scheduledAt = new Date(Date.now() + 3_600_000)

        await createUseCase().execute({ ...BASE_INPUT, scheduledAt })

        expect(queueMock.enqueueSendCertificateEmails).not.toHaveBeenCalled()
        expect(certificateEmission.serialize().status).toBe(
            CERTIFICATE_STATUS.SCHEDULED,
        )
        expect(emailsRepositoryMock.save).toHaveBeenCalledTimes(1)
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(null)

        const useCase = new CreateEmailUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsReadRepository,
            {} as IEmailsRepository,
            {} as IQueue,
            {} as ITransactionManager,
        )

        await expect(useCase.execute(BASE_INPUT)).rejects.toThrow(
            CertificateNotFoundError,
        )
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ userId: 'outro-usuario' }),
        )

        const useCase = new CreateEmailUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsReadRepository,
            {} as IEmailsRepository,
            {} as IQueue,
            {} as ITransactionManager,
        )

        await expect(useCase.execute(BASE_INPUT)).rejects.toThrow(
            NotCertificateOwnerError,
        )
    })

    it('deve lançar erro quando a emissão de certificado já tiver sido emitida', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ status: CERTIFICATE_STATUS.EMITTED }),
        )

        const useCase = new CreateEmailUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsReadRepository,
            {} as IEmailsRepository,
            {} as IQueue,
            {} as ITransactionManager,
        )

        await expect(useCase.execute(BASE_INPUT)).rejects.toThrow(
            CertificateEmittedError,
        )
    })

    it('deve lançar erro quando não houver fonte de dados vinculada à emissão', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ dataSource: null }),
        )
        // countByCertificateEmissionId é chamado ANTES do check hasDataSource
        dataSourceRowsReadRepositoryStub.countByCertificateEmissionId =
            async () => 0

        const useCase = new CreateEmailUseCase(
            certificatesRepositoryMock,
            dataSourceRowsReadRepositoryStub,
            {} as IEmailsRepository,
            {} as IQueue,
            {} as ITransactionManager,
        )

        await expect(useCase.execute(BASE_INPUT)).rejects.toThrow(
            DataSourceNotFoundError,
        )
    })

    it('deve lançar erro quando não houver linhas na fonte de dados e o envio for agendado', async () => {
        dataSourceRowsReadRepositoryStub.countByCertificateEmissionId =
            async () => 0

        const useCase = new CreateEmailUseCase(
            certificatesRepositoryMock,
            dataSourceRowsReadRepositoryStub,
            {} as IEmailsRepository,
            {} as IQueue,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                ...BASE_INPUT,
                scheduledAt: new Date(Date.now() + 3_600_000),
            }),
        ).rejects.toThrow(NoDataSourceRowsError)
    })

    it('deve lançar erro quando a coluna de e-mail não existir na fonte de dados', async () => {
        dataSourceRowsReadRepositoryStub.getManyByCertificateEmissionId =
            (async () =>
                undefined) as unknown as IDataSourceRowsReadRepository['getManyByCertificateEmissionId']

        const useCase = new CreateEmailUseCase(
            certificatesRepositoryMock,
            dataSourceRowsReadRepositoryStub,
            {} as IEmailsRepository,
            {} as IQueue,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({
                ...BASE_INPUT,
                emailColumn: 'ColunaInexistente',
            }),
        ).rejects.toThrow(UnexistentDataSourceColumnError)
    })

    it('deve lançar erro quando existir destinatário com e-mail inválido', async () => {
        dataSourceRowsReadRepositoryStub.getManyByCertificateEmissionId =
            async () => ({
                data: [createRow('r1', 'email-invalido')],
                nextCursor: null,
            })

        const useCase = new CreateEmailUseCase(
            certificatesRepositoryMock,
            dataSourceRowsReadRepositoryStub,
            {} as IEmailsRepository,
            {} as IQueue,
            {} as ITransactionManager,
        )

        await expect(useCase.execute(BASE_INPUT)).rejects.toThrow(
            InvalidRecipientEmailError,
        )
    })
})
