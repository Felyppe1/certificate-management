import { describe, expect, it, vi, beforeEach, Mock } from 'vitest'
import { RetryCertificatesGenerationUseCase } from './retry-certificates-generation-use-case'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/write/idata-source-rows-repository'
import { IDataSourceRowsReadRepository } from './interfaces/repository/read/idata-source-rows-read-repository'
import { IQueue } from './interfaces/messaging/iqueue'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { Template, TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import { DataSource, DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
import { PROCESSING_STATUS_ENUM } from '../domain/data-source-row'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { TemplateNotFoundError } from '../domain/error/not-found-error/template-not-found-error'
import { DataSourceNotFoundError } from '../domain/error/not-found-error/data-source-not-found-error'
import { NoFailedDataSourceRowsError } from '../domain/error/validation-error/no-failed-data-source-rows-error'

describe('RetryCertificatesGenerationUseCase', () => {
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

    let certificateEmissionsRepository: {
        getById: Mock<ICertificatesRepository['getById']>
    }
    let dataSourceRowsRepository: {
        updateManyProcessingStatus: Mock<
            IDataSourceRowsRepository['updateManyProcessingStatus']
        >
    }
    let dataSourceRowsReadRepository: {
        getManyByCertificateEmissionId: Mock<
            IDataSourceRowsReadRepository['getManyByCertificateEmissionId']
        >
        countWithStatuses: Mock<
            IDataSourceRowsReadRepository['countWithStatuses']
        >
    }
    let queue: {
        enqueueGenerateCertificatePDF: Mock<
            IQueue['enqueueGenerateCertificatePDF']
        >
    }

    beforeEach(() => {
        certificateEmissionsRepository = { getById: vi.fn() }
        dataSourceRowsRepository = { updateManyProcessingStatus: vi.fn() }
        dataSourceRowsReadRepository = {
            getManyByCertificateEmissionId: vi.fn(),
            countWithStatuses: vi.fn(),
        }
        queue = { enqueueGenerateCertificatePDF: vi.fn() }
    })

    function makeUseCase() {
        return new RetryCertificatesGenerationUseCase(
            certificateEmissionsRepository,
            dataSourceRowsRepository,
            dataSourceRowsReadRepository,
            queue,
        )
    }

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        certificateEmissionsRepository.getById.mockResolvedValue(null)

        await expect(
            makeUseCase().execute({
                certificateEmissionId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(CertificateNotFoundError)
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        certificateEmissionsRepository.getById.mockResolvedValue(
            createCertificateEmission({ userId: 'outro-usuario' }),
        )

        await expect(
            makeUseCase().execute({
                certificateEmissionId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(NotCertificateOwnerError)
    })

    it('deve lançar erro quando a emissão já tiver sido enviada', async () => {
        certificateEmissionsRepository.getById.mockResolvedValue(
            createCertificateEmission({ status: CERTIFICATE_STATUS.EMITTED }),
        )

        await expect(
            makeUseCase().execute({
                certificateEmissionId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(CertificateEmittedError)
    })

    it('deve lançar erro quando não houver template vinculado', async () => {
        certificateEmissionsRepository.getById.mockResolvedValue(
            createCertificateEmission({ template: null }),
        )

        await expect(
            makeUseCase().execute({
                certificateEmissionId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(TemplateNotFoundError)
    })

    it('deve lançar erro quando não houver fonte de dados vinculada', async () => {
        certificateEmissionsRepository.getById.mockResolvedValue(
            createCertificateEmission({ dataSource: null }),
        )

        await expect(
            makeUseCase().execute({
                certificateEmissionId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(DataSourceNotFoundError)
    })

    it('deve lançar erro quando não houver linhas com falha', async () => {
        certificateEmissionsRepository.getById.mockResolvedValue(
            createCertificateEmission({ dataSource: createDataSource() }),
        )
        dataSourceRowsReadRepository.countWithStatuses.mockResolvedValue(0)

        await expect(
            makeUseCase().execute({
                certificateEmissionId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(NoFailedDataSourceRowsError)
    })

    it('deve enfileirar o retry das linhas com falha e retornar o total', async () => {
        certificateEmissionsRepository.getById.mockResolvedValue(
            createCertificateEmission({ dataSource: createDataSource() }),
        )
        dataSourceRowsReadRepository.countWithStatuses.mockResolvedValue(1)
        dataSourceRowsReadRepository.getManyByCertificateEmissionId.mockResolvedValue(
            {
                data: [{ id: 'row-failed', data: {} }],
                nextCursor: null,
            },
        )
        queue.enqueueGenerateCertificatePDF.mockResolvedValue()
        dataSourceRowsRepository.updateManyProcessingStatus.mockResolvedValue()

        const result = await makeUseCase().execute({
            certificateEmissionId: CERTIFICATE_ID,
            userId: USER_ID,
        })

        expect(
            dataSourceRowsRepository.updateManyProcessingStatus,
        ).toHaveBeenCalledWith(['row-failed'], PROCESSING_STATUS_ENUM.RETRYING)
        expect(result).toEqual({ totalRetrying: 1 })
    })
})
