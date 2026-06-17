import { describe, expect, it, vi, beforeEach } from 'vitest'
import { DownloadTemplateUseCase } from './download-template-use-case'
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
import { TemplateNotFoundError } from '../domain/error/not-found-error/template-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'

describe('DownloadTemplateUseCase', () => {
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

        const useCase = new DownloadTemplateUseCase(
            {} as IBucket,
            certificateRepositoryMock,
        )

        await expect(
            useCase.execute({
                userId: USER_ID,
                certificateEmissionId: CERTIFICATE_ID,
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

        const useCase = new DownloadTemplateUseCase(
            {} as IBucket,
            certificateRepositoryMock,
        )

        await expect(
            useCase.execute({
                userId: USER_ID,
                certificateEmissionId: CERTIFICATE_ID,
            }),
        ).rejects.toThrow(NotCertificateOwnerError)
    })

    it('deve lançar erro quando não houver template vinculado', async () => {
        certificateRepositoryMock = {
            getById: vi
                .fn()
                .mockResolvedValue(
                    createCertificateEmission({ template: null }),
                ),
        }

        const useCase = new DownloadTemplateUseCase(
            {} as IBucket,
            certificateRepositoryMock,
        )

        await expect(
            useCase.execute({
                userId: USER_ID,
                certificateEmissionId: CERTIFICATE_ID,
            }),
        ).rejects.toThrow(TemplateNotFoundError)
    })

    it('deve retornar a URL assinada do template com sucesso', async () => {
        const SIGNED_URL = 'https://storage.googleapis.com/signed-url-template'

        certificateRepositoryMock = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
        }

        bucketMock = {
            generateSignedUrl: vi.fn().mockResolvedValue(SIGNED_URL),
        }

        const useCase = new DownloadTemplateUseCase(
            bucketMock,
            certificateRepositoryMock,
        )

        const result = await useCase.execute({
            userId: USER_ID,
            certificateEmissionId: CERTIFICATE_ID,
        })

        expect(result).toBe(SIGNED_URL)
        expect(bucketMock.generateSignedUrl).toHaveBeenCalledOnce()
    })
})
