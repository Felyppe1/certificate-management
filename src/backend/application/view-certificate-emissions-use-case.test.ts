import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ViewCertificateEmissionsUseCase } from './view-certificate-emissions-use-case'
import { IBucket } from './interfaces/cloud/ibucket'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { Template, TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import { DataSource, DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
import { DataSourceRowNotFoundError } from '../domain/error/not-found-error/data-source-row-not-found-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'

describe('ViewCertificateEmissionsUseCase', () => {
    const USER_ID = 'user-1'
    const CERTIFICATE_ID = 'cert-1'
    const ROW_IDS = ['row-1', 'row-2']

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
            dataSource: overrides?.dataSource ?? null,
            variableColumnMapping: null,
        })
    }

    function createDataSourceRowMock(id: string, overrides = {}) {
        return {
            getId: () => id,
            getCertificateEmissionId: () => CERTIFICATE_ID,
            ...overrides,
        }
    }

    let certificateRepositoryMock: Pick<ICertificatesRepository, 'getById'>
    let dataSourceRowsRepositoryMock: Pick<
        IDataSourceRowsRepository,
        'getByIds'
    >
    let bucketMock: Pick<IBucket, 'generateSignedUrl'>

    beforeEach(() => vi.clearAllMocks())

    it('deve lançar erro quando nenhuma linha for encontrada', async () => {
        dataSourceRowsRepositoryMock = {
            getByIds: vi.fn().mockResolvedValue([]),
        }

        const useCase = new ViewCertificateEmissionsUseCase(
            {} as IBucket,
            {} as ICertificatesRepository,
            dataSourceRowsRepositoryMock,
        )

        await expect(
            useCase.execute({ userId: USER_ID, rowIds: ROW_IDS }),
        ).rejects.toThrow(DataSourceRowNotFoundError)
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        dataSourceRowsRepositoryMock = {
            getByIds: vi
                .fn()
                .mockResolvedValue([createDataSourceRowMock('row-1')]),
        }

        certificateRepositoryMock = {
            getById: vi.fn().mockResolvedValue(null),
        }

        const useCase = new ViewCertificateEmissionsUseCase(
            {} as IBucket,
            certificateRepositoryMock,
            dataSourceRowsRepositoryMock,
        )

        await expect(
            useCase.execute({ userId: USER_ID, rowIds: ROW_IDS }),
        ).rejects.toThrow(CertificateNotFoundError)
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        dataSourceRowsRepositoryMock = {
            getByIds: vi
                .fn()
                .mockResolvedValue([createDataSourceRowMock('row-1')]),
        }

        certificateRepositoryMock = {
            getById: vi
                .fn()
                .mockResolvedValue(
                    createCertificateEmission({ userId: 'outro-usuario' }),
                ),
        }

        const useCase = new ViewCertificateEmissionsUseCase(
            {} as IBucket,
            certificateRepositoryMock,
            dataSourceRowsRepositoryMock,
        )

        await expect(
            useCase.execute({ userId: USER_ID, rowIds: ROW_IDS }),
        ).rejects.toThrow(NotCertificateOwnerError)
    })

    it('deve retornar URLs assinadas para cada linha no caminho feliz', async () => {
        const SIGNED_URL_1 = 'https://storage.googleapis.com/signed-url-row-1'
        const SIGNED_URL_2 = 'https://storage.googleapis.com/signed-url-row-2'

        dataSourceRowsRepositoryMock = {
            getByIds: vi
                .fn()
                .mockResolvedValue([
                    createDataSourceRowMock('row-1'),
                    createDataSourceRowMock('row-2'),
                ]),
        }

        certificateRepositoryMock = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
        }

        bucketMock = {
            generateSignedUrl: vi
                .fn()
                .mockResolvedValueOnce(SIGNED_URL_1)
                .mockResolvedValueOnce(SIGNED_URL_2),
        }

        const useCase = new ViewCertificateEmissionsUseCase(
            bucketMock,
            certificateRepositoryMock,
            dataSourceRowsRepositoryMock,
        )

        const result = await useCase.execute({
            userId: USER_ID,
            rowIds: ROW_IDS,
        })

        expect(result).toHaveLength(2)
        expect(result[0]).toMatchObject({
            rowId: 'row-1',
            signedUrl: SIGNED_URL_1,
        })
        expect(result[1]).toMatchObject({
            rowId: 'row-2',
            signedUrl: SIGNED_URL_2,
        })
    })
})
