import { beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import { DeleteTemplateUseCase } from './delete-template-use-case'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/write/idata-source-rows-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { Template, TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import { DataSource, DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
import { IBucket } from './interfaces/storage/ibucket'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { TemplateNotFoundError } from '../domain/error/not-found-error/template-not-found-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'

describe('DeleteTemplateUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'

    function createTemplate() {
        return new Template({
            fileMimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
            inputMethod: INPUT_METHOD.UPLOAD,
            driveFileId: null,
            storageFileUrl: 'https://storage/file.docx',
            fileName: 'file.docx',
            variables: [],
            thumbnailUrl: null,
            googleAccountEmail: null,
        })
    }

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
                { name: 'Nome', type: 'string' as const, arrayMetadata: null },
            ],
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
            name: 'Name',
            userId: overrides?.userId ?? USER_ID,
            template:
                overrides?.template !== undefined
                    ? overrides.template
                    : createTemplate(),
            createdAt: new Date(),
            status: overrides?.status ?? CERTIFICATE_STATUS.DRAFT,
            dataSource: overrides?.dataSource ?? null,
            variableColumnMapping: null,
        })
    }

    let certificateEmissionsRepositoryMock: {
        getById: Mock<ICertificatesRepository['getById']>
        update: Mock<ICertificatesRepository['update']>
    }

    let dataSourceRowsRepositoryMock: {
        resetProcessingStatusByCertificateEmissionId: Mock<
            IDataSourceRowsRepository['resetProcessingStatusByCertificateEmissionId']
        >
    }

    let bucketStub: Pick<IBucket, 'deleteObject'>

    let transactionManagerStub: Pick<ITransactionManager, 'run'>

    beforeEach(() => {
        certificateEmissionsRepositoryMock = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }
        dataSourceRowsRepositoryMock = {
            resetProcessingStatusByCertificateEmissionId: vi.fn(),
        }
        bucketStub = {
            async deleteObject() {},
        }
        transactionManagerStub = {
            async run<T>(work: () => Promise<T>): Promise<T> {
                return work()
            },
        }
    })

    function createUseCase() {
        return new DeleteTemplateUseCase(
            certificateEmissionsRepositoryMock,
            dataSourceRowsRepositoryMock,
            bucketStub,
            transactionManagerStub,
        )
    }

    it('deve deletar o template da emissão de certificado com sucesso', async () => {
        const certificateEmission = createCertificateEmission()
        certificateEmissionsRepositoryMock.getById.mockResolvedValue(
            certificateEmission,
        )

        await createUseCase().execute({
            certificateId: CERTIFICATE_ID,
            userId: USER_ID,
        })

        expect(certificateEmissionsRepositoryMock.update).toHaveBeenCalledWith(
            certificateEmission,
        )
        expect(certificateEmission.hasTemplate()).toBe(false)
    })

    it('deve resetar o status de processamento das linhas da fonte de dados ao deletar o template quando houver fonte de dados vinculada', async () => {
        certificateEmissionsRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({
                dataSource: createDataSource(),
            }),
        )

        await createUseCase().execute({
            certificateId: CERTIFICATE_ID,
            userId: USER_ID,
        })

        expect(
            dataSourceRowsRepositoryMock.resetProcessingStatusByCertificateEmissionId,
        ).toHaveBeenCalledWith(CERTIFICATE_ID)
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        certificateEmissionsRepositoryMock.getById.mockResolvedValue(null)

        await expect(
            createUseCase().execute({
                certificateId: 'nao-existe',
                userId: USER_ID,
            }),
        ).rejects.toThrow(CertificateNotFoundError)

        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        certificateEmissionsRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ userId: 'outro-usuario' }),
        )

        await expect(
            createUseCase().execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(NotCertificateOwnerError)

        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a emissão de certificado já tiver sido emitida', async () => {
        certificateEmissionsRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({
                status: CERTIFICATE_STATUS.EMITTED,
            }),
        )

        await expect(
            createUseCase().execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(CertificateEmittedError)

        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a emissão de certificado não tiver template vinculado', async () => {
        certificateEmissionsRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ template: null }),
        )

        await expect(
            createUseCase().execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(TemplateNotFoundError)

        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })
})
