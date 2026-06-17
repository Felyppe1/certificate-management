import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ResendEmailsUseCase } from './resend-emails-use-case'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsReadRepository } from './interfaces/repository/idata-source-rows-read-repository'
import { IEmailsRepository } from './interfaces/repository/iemails-repository'
import { IQueue } from './interfaces/cloud/iqueue'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { Template, TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import { DataSource, DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateNotEmittedError } from '../domain/error/validation-error/certificate-not-emitted-error'
import { DataSourceNotFoundError } from '../domain/error/not-found-error/data-source-not-found-error'
import { EmailNotFoundError } from '../domain/error/not-found-error/email-not-found-error'
import { UnexistentDataSourceColumnError } from '../domain/error/validation-error/unexistent-data-source-column-error'
import { DataSourceRowsNotFoundError } from '../domain/error/validation-error/data-source-rows-not-found-error'

describe('ResendEmailsUseCase', () => {
    const USER_ID = 'user-1'
    const CERTIFICATE_ID = 'cert-1'

    function createTemplate() {
        return new Template({
            fileMimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
            inputMethod: INPUT_METHOD.UPLOAD,
            driveFileId: null,
            storageFileUrl: 'https://storage/template.docx',
            fileName: 'template.docx',
            variables: [],
            thumbnailUrl: null,
            googleAccountEmail: null,
        })
    }

    function createDataSource(
        columns: { name: string }[] = [{ name: 'Email' }],
    ) {
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
            columns: columns.map(col => ({
                name: col.name,
                type: 'string' as const,
                arrayMetadata: null,
            })),
            googleAccountEmail: null,
        })
    }

    function createCertificateEmission(overrides?: {
        userId?: string
        status?: CERTIFICATE_STATUS
        template?: Template | null
        dataSource?: DataSource | null
    }) {
        return new CertificateEmission({
            id: CERTIFICATE_ID,
            name: 'Certificado Teste',
            userId: overrides?.userId ?? USER_ID,
            template:
                overrides?.template !== undefined
                    ? overrides.template
                    : createTemplate(),
            createdAt: new Date(),
            status: overrides?.status ?? CERTIFICATE_STATUS.DRAFT,
            dataSource:
                overrides?.dataSource !== undefined
                    ? overrides.dataSource
                    : null,
            variableColumnMapping: null,
        })
    }

    function createEmailMock() {
        return {
            getId: () => 'email-id',
            getEmailColumn: vi.fn().mockReturnValue('Email'),
            serialize: vi
                .fn()
                .mockReturnValue({ subject: 'Certificado', body: 'Olá' }),
        }
    }

    let certificateEmissionsRepository: Pick<ICertificatesRepository, 'getById'>
    let dataSourceRowsReadRepository: Pick<
        IDataSourceRowsReadRepository,
        'getManyByCertificateEmissionId'
    >
    let emailsRepository: Pick<IEmailsRepository, 'getByCertificateEmissionId'>
    let queue: Pick<IQueue, 'enqueueSendCertificateEmails'>

    beforeEach(() => {
        vi.clearAllMocks()
        certificateEmissionsRepository = { getById: vi.fn() }
        dataSourceRowsReadRepository = {
            getManyByCertificateEmissionId: vi.fn(),
        }
        emailsRepository = { getByCertificateEmissionId: vi.fn() }
        queue = { enqueueSendCertificateEmails: vi.fn() }
    })

    function makeUseCase() {
        return new ResendEmailsUseCase(
            certificateEmissionsRepository,
            dataSourceRowsReadRepository,
            emailsRepository,
            queue,
        )
    }

    it('deve retornar sem executar nada quando a lista de destinatários estiver vazia', async () => {
        await makeUseCase().execute({
            userId: USER_ID,
            certificateEmissionId: CERTIFICATE_ID,
            rowIds: [],
        })

        expect(certificateEmissionsRepository.getById).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        vi.mocked(certificateEmissionsRepository.getById).mockResolvedValue(
            null,
        )

        await expect(
            makeUseCase().execute({
                userId: USER_ID,
                certificateEmissionId: CERTIFICATE_ID,
                rowIds: ['row-1'],
            }),
        ).rejects.toThrow(CertificateNotFoundError)
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        vi.mocked(certificateEmissionsRepository.getById).mockResolvedValue(
            createCertificateEmission({ userId: 'outro-usuario' }),
        )

        await expect(
            makeUseCase().execute({
                userId: USER_ID,
                certificateEmissionId: CERTIFICATE_ID,
                rowIds: ['row-1'],
            }),
        ).rejects.toThrow(NotCertificateOwnerError)
    })

    it('deve lançar erro quando a emissão de certificado não tiver sido enviada', async () => {
        vi.mocked(certificateEmissionsRepository.getById).mockResolvedValue(
            createCertificateEmission({ status: CERTIFICATE_STATUS.DRAFT }),
        )

        await expect(
            makeUseCase().execute({
                userId: USER_ID,
                certificateEmissionId: CERTIFICATE_ID,
                rowIds: ['row-1'],
            }),
        ).rejects.toThrow(CertificateNotEmittedError)
    })

    it('deve lançar erro quando não houver fonte de dados vinculada', async () => {
        vi.mocked(certificateEmissionsRepository.getById).mockResolvedValue(
            createCertificateEmission({
                status: CERTIFICATE_STATUS.EMITTED,
                dataSource: null,
            }),
        )

        await expect(
            makeUseCase().execute({
                userId: USER_ID,
                certificateEmissionId: CERTIFICATE_ID,
                rowIds: ['row-1'],
            }),
        ).rejects.toThrow(DataSourceNotFoundError)
    })

    it('deve lançar erro quando a configuração de e-mail não for encontrada', async () => {
        vi.mocked(certificateEmissionsRepository.getById).mockResolvedValue(
            createCertificateEmission({
                status: CERTIFICATE_STATUS.EMITTED,
                dataSource: createDataSource(),
            }),
        )
        vi.mocked(
            emailsRepository.getByCertificateEmissionId,
        ).mockResolvedValue(null)

        await expect(
            makeUseCase().execute({
                userId: USER_ID,
                certificateEmissionId: CERTIFICATE_ID,
                rowIds: ['row-1'],
            }),
        ).rejects.toThrow(EmailNotFoundError)
    })

    it('deve lançar erro quando a coluna de e-mail não existir na fonte de dados', async () => {
        vi.mocked(certificateEmissionsRepository.getById).mockResolvedValue(
            createCertificateEmission({
                status: CERTIFICATE_STATUS.EMITTED,
                dataSource: createDataSource([{ name: 'Nome' }]),
            }),
        )
        const emailMock = createEmailMock()
        vi.mocked(
            emailsRepository.getByCertificateEmissionId,
        ).mockResolvedValue(emailMock as any)

        await expect(
            makeUseCase().execute({
                userId: USER_ID,
                certificateEmissionId: CERTIFICATE_ID,
                rowIds: ['row-1'],
            }),
        ).rejects.toThrow(UnexistentDataSourceColumnError)
    })

    it('deve lançar erro quando algum dos IDs de linha não for encontrado', async () => {
        vi.mocked(certificateEmissionsRepository.getById).mockResolvedValue(
            createCertificateEmission({
                status: CERTIFICATE_STATUS.EMITTED,
                dataSource: createDataSource([{ name: 'Email' }]),
            }),
        )
        const emailMock = createEmailMock()
        vi.mocked(
            emailsRepository.getByCertificateEmissionId,
        ).mockResolvedValue(emailMock as any)
        vi.mocked(
            dataSourceRowsReadRepository.getManyByCertificateEmissionId,
        ).mockResolvedValue({
            data: [{ id: 'row-1', data: { Email: 'a@example.com' } }],
            nextCursor: null,
        })

        await expect(
            makeUseCase().execute({
                userId: USER_ID,
                certificateEmissionId: CERTIFICATE_ID,
                rowIds: ['row-1', 'row-2'],
            }),
        ).rejects.toThrow(DataSourceRowsNotFoundError)
    })

    it('deve enfileirar o envio de e-mails no caminho feliz', async () => {
        vi.mocked(certificateEmissionsRepository.getById).mockResolvedValue(
            createCertificateEmission({
                status: CERTIFICATE_STATUS.EMITTED,
                dataSource: createDataSource([{ name: 'Email' }]),
            }),
        )
        const emailMock = createEmailMock()
        vi.mocked(
            emailsRepository.getByCertificateEmissionId,
        ).mockResolvedValue(emailMock as any)
        vi.mocked(
            dataSourceRowsReadRepository.getManyByCertificateEmissionId,
        ).mockResolvedValue({
            data: [{ id: 'row-1', data: { Email: 'a@example.com' } }],
            nextCursor: null,
        })
        vi.mocked(queue.enqueueSendCertificateEmails).mockResolvedValue()

        await makeUseCase().execute({
            userId: USER_ID,
            certificateEmissionId: CERTIFICATE_ID,
            rowIds: ['row-1'],
        })

        expect(queue.enqueueSendCertificateEmails).toHaveBeenCalledWith(
            expect.objectContaining({
                certificateEmissionId: CERTIFICATE_ID,
                recipients: [{ rowId: 'row-1', email: 'a@example.com' }],
            }),
        )
    })
})
