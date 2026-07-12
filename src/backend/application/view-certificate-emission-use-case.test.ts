import { describe, expect, it, Mock, vi, beforeEach } from 'vitest'
import { ViewCertificateEmissionUseCase } from './view-certificate-emission-use-case'
import { IBucket } from './interfaces/storage/ibucket'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/write/idata-source-rows-repository'
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

describe('ViewCertificateEmissionUseCase', () => {
    const USER_ID = 'user-1'
    const CERTIFICATE_ID = 'cert-1'
    const ROW_ID = 'row-1'

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

    function createDataSourceRowMock(overrides = {}) {
        return {
            getId: () => ROW_ID,
            getCertificateEmissionId: () => CERTIFICATE_ID,
            ...overrides,
        }
    }

    let certificateRepositoryStub: Pick<ICertificatesRepository, 'getById'>
    let dataSourceRowsRepositoryStub: Pick<IDataSourceRowsRepository, 'getById'>
    let bucketMock: {
        generateSignedUrl: Mock<IBucket['generateSignedUrl']>
    }

    beforeEach(() => {
        certificateRepositoryStub = {
            async getById() {
                return createCertificateEmission()
            },
        }
        dataSourceRowsRepositoryStub = {
            async getById() {
                return createDataSourceRowMock() as never
            },
        }
        bucketMock = {
            generateSignedUrl: vi.fn(),
        }
    })

    it('deve lançar erro quando a linha não for encontrada', async () => {
        dataSourceRowsRepositoryStub.getById = async () => null

        const useCase = new ViewCertificateEmissionUseCase(
            bucketMock,
            certificateRepositoryStub,
            dataSourceRowsRepositoryStub,
        )

        await expect(
            useCase.execute({ userId: USER_ID, rowId: ROW_ID }),
        ).rejects.toThrow(DataSourceRowNotFoundError)
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        certificateRepositoryStub.getById = async () => null

        const useCase = new ViewCertificateEmissionUseCase(
            bucketMock,
            certificateRepositoryStub,
            dataSourceRowsRepositoryStub,
        )

        await expect(
            useCase.execute({ userId: USER_ID, rowId: ROW_ID }),
        ).rejects.toThrow(CertificateNotFoundError)
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        certificateRepositoryStub.getById = async () =>
            createCertificateEmission({ userId: 'outro-usuario' })

        const useCase = new ViewCertificateEmissionUseCase(
            bucketMock,
            certificateRepositoryStub,
            dataSourceRowsRepositoryStub,
        )

        await expect(
            useCase.execute({ userId: USER_ID, rowId: ROW_ID }),
        ).rejects.toThrow(NotCertificateOwnerError)
    })

    it('deve retornar a URL assinada para visualização no caminho feliz', async () => {
        const SIGNED_URL = 'https://storage.googleapis.com/signed-url-view'

        bucketMock.generateSignedUrl.mockResolvedValue(SIGNED_URL)

        const useCase = new ViewCertificateEmissionUseCase(
            bucketMock,
            certificateRepositoryStub,
            dataSourceRowsRepositoryStub,
        )

        const result = await useCase.execute({ userId: USER_ID, rowId: ROW_ID })

        expect(result).toBe(SIGNED_URL)
        expect(bucketMock.generateSignedUrl).toHaveBeenCalledOnce()
    })
})
