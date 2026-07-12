import { describe, expect, it, vi, beforeEach, Mock } from 'vitest'
import { GenerateCertificatesUseCase } from './generate-certificates-use-case'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/write/idata-source-rows-repository'
import { IDataSourceRowsReadRepository } from './interfaces/repository/read/idata-source-rows-read-repository'
import { IBucket } from './interfaces/storage/ibucket'
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
import { NoDataSourceRowsError } from '../domain/error/validation-error/no-data-source-rows-error'
import { DataSourceRowsNotReadyError } from '../domain/error/validation-error/data-source-rows-not-ready-error'
import { InsufficientCreditsError } from '../domain/error/validation-error/insufficient-credits-error'

describe('GenerateCertificatesUseCase', () => {
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
    let usersRepository: {
        deductCredits: Mock<IUsersRepository['deductCredits']>
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
        countByCertificateEmissionId: Mock<
            IDataSourceRowsReadRepository['countByCertificateEmissionId']
        >
        countWithStatuses: Mock<
            IDataSourceRowsReadRepository['countWithStatuses']
        >
    }
    let bucket: {
        deleteObjectsWithPrefix: Mock<IBucket['deleteObjectsWithPrefix']>
    }
    let queue: {
        enqueueGenerateCertificatePDF: Mock<
            IQueue['enqueueGenerateCertificatePDF']
        >
    }

    beforeEach(() => {
        certificateEmissionsRepository = { getById: vi.fn() }
        usersRepository = { deductCredits: vi.fn() }
        dataSourceRowsRepository = { updateManyProcessingStatus: vi.fn() }
        dataSourceRowsReadRepository = {
            getManyByCertificateEmissionId: vi.fn(),
            countByCertificateEmissionId: vi.fn(),
            countWithStatuses: vi.fn(),
        }
        bucket = { deleteObjectsWithPrefix: vi.fn() }
        queue = { enqueueGenerateCertificatePDF: vi.fn() }
    })

    function makeUseCase() {
        return new GenerateCertificatesUseCase(
            bucket,
            certificateEmissionsRepository,
            usersRepository,
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

    it('deve lançar erro quando não houver linhas na fonte de dados', async () => {
        certificateEmissionsRepository.getById.mockResolvedValue(
            createCertificateEmission({ dataSource: createDataSource() }),
        )
        dataSourceRowsReadRepository.countByCertificateEmissionId.mockResolvedValue(
            0,
        )

        await expect(
            makeUseCase().execute({
                certificateEmissionId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(NoDataSourceRowsError)
    })

    it('deve lançar erro quando nem todas as linhas estiverem com status pendente', async () => {
        certificateEmissionsRepository.getById.mockResolvedValue(
            createCertificateEmission({ dataSource: createDataSource() }),
        )
        dataSourceRowsReadRepository.countByCertificateEmissionId.mockResolvedValue(
            3,
        )
        dataSourceRowsReadRepository.countWithStatuses.mockResolvedValue(2)

        await expect(
            makeUseCase().execute({
                certificateEmissionId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(DataSourceRowsNotReadyError)
    })

    it('deve lançar erro quando não houver créditos suficientes', async () => {
        certificateEmissionsRepository.getById.mockResolvedValue(
            createCertificateEmission({ dataSource: createDataSource() }),
        )
        dataSourceRowsReadRepository.countByCertificateEmissionId.mockResolvedValue(
            2,
        )
        dataSourceRowsReadRepository.countWithStatuses.mockResolvedValue(2)
        usersRepository.deductCredits.mockResolvedValue(false)

        await expect(
            makeUseCase().execute({
                certificateEmissionId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(InsufficientCreditsError)
    })

    it('deve enfileirar os jobs e atualizar o status das linhas para RUNNING com sucesso', async () => {
        certificateEmissionsRepository.getById.mockResolvedValue(
            createCertificateEmission({ dataSource: createDataSource() }),
        )
        dataSourceRowsReadRepository.countByCertificateEmissionId.mockResolvedValue(
            2,
        )
        dataSourceRowsReadRepository.countWithStatuses.mockResolvedValue(2)
        usersRepository.deductCredits.mockResolvedValue(true)
        bucket.deleteObjectsWithPrefix.mockResolvedValue()
        dataSourceRowsReadRepository.getManyByCertificateEmissionId.mockResolvedValue(
            {
                data: [
                    { id: 'row-1', data: {} },
                    { id: 'row-2', data: {} },
                ],
                nextCursor: null,
            },
        )
        queue.enqueueGenerateCertificatePDF.mockResolvedValue()
        dataSourceRowsRepository.updateManyProcessingStatus.mockResolvedValue()

        await makeUseCase().execute({
            certificateEmissionId: CERTIFICATE_ID,
            userId: USER_ID,
        })

        expect(
            dataSourceRowsRepository.updateManyProcessingStatus,
        ).toHaveBeenCalledWith(
            ['row-1', 'row-2'],
            PROCESSING_STATUS_ENUM.RUNNING,
        )
    })
})
