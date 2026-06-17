import { describe, expect, it, vi, beforeEach } from 'vitest'
import { DownloadDataSourceUseCase } from './download-data-source-use-case'
import { IBucket } from './interfaces/cloud/ibucket'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { Template, TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import { DataSource, DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { DataSourceNotFoundError } from '../domain/error/not-found-error/data-source-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'

describe('DownloadDataSourceUseCase', () => {
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
            dataSource: overrides?.dataSource ?? null,
            variableColumnMapping: null,
        })
    }

    let certificateRepositoryMock: Pick<ICertificatesRepository, 'getById'>
    let bucketMock: Pick<IBucket, 'generateSignedUrl'>

    beforeEach(() => vi.clearAllMocks())

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        certificateRepositoryMock = {
            getById: vi.fn().mockResolvedValue(null),
        }

        const useCase = new DownloadDataSourceUseCase(
            {} as IBucket,
            certificateRepositoryMock,
        )

        await expect(
            useCase.execute({
                userId: USER_ID,
                certificateEmissionId: CERTIFICATE_ID,
                fileIndex: 0,
            }),
        ).rejects.toThrow(CertificateNotFoundError)
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        certificateRepositoryMock = {
            getById: vi
                .fn()
                .mockResolvedValue(
                    createCertificateEmission({ userId: 'outro-usuario' }),
                ),
        }

        const useCase = new DownloadDataSourceUseCase(
            {} as IBucket,
            certificateRepositoryMock,
        )

        await expect(
            useCase.execute({
                userId: USER_ID,
                certificateEmissionId: CERTIFICATE_ID,
                fileIndex: 0,
            }),
        ).rejects.toThrow(NotCertificateOwnerError)
    })

    it('deve lançar erro quando não houver fonte de dados', async () => {
        certificateRepositoryMock = {
            getById: vi
                .fn()
                .mockResolvedValue(
                    createCertificateEmission({ dataSource: null }),
                ),
        }

        const useCase = new DownloadDataSourceUseCase(
            {} as IBucket,
            certificateRepositoryMock,
        )

        await expect(
            useCase.execute({
                userId: USER_ID,
                certificateEmissionId: CERTIFICATE_ID,
                fileIndex: 0,
            }),
        ).rejects.toThrow(DataSourceNotFoundError)
    })

    it('deve retornar a URL assinada da fonte de dados com sucesso', async () => {
        const SIGNED_URL =
            'https://storage.googleapis.com/signed-url-datasource'

        certificateRepositoryMock = {
            getById: vi
                .fn()
                .mockResolvedValue(
                    createCertificateEmission({
                        dataSource: createDataSource(),
                    }),
                ),
        }

        bucketMock = {
            generateSignedUrl: vi.fn().mockResolvedValue(SIGNED_URL),
        }

        const useCase = new DownloadDataSourceUseCase(
            bucketMock,
            certificateRepositoryMock,
        )

        const result = await useCase.execute({
            userId: USER_ID,
            certificateEmissionId: CERTIFICATE_ID,
            fileIndex: 0,
        })

        expect(result).toBe(SIGNED_URL)
        expect(bucketMock.generateSignedUrl).toHaveBeenCalledOnce()
    })
})
