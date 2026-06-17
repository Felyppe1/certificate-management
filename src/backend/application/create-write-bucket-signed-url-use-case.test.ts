import { describe, expect, it, vi, beforeEach } from 'vitest'
import { CreateWriteBucketSignedUrlUseCase } from './create-write-bucket-signed-url-use-case'
import { IBucket } from './interfaces/cloud/ibucket'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { Template, TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'

describe('CreateWriteBucketSignedUrlUseCase', () => {
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

    function createCertificateEmission(overrides?: {
        userId?: string
        status?: CERTIFICATE_STATUS
        template?: Template | null
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
            dataSource: null,
            variableColumnMapping: null,
        })
    }

    let bucket: Pick<IBucket, 'generateSignedUrl'>
    let certificateRepository: Pick<ICertificatesRepository, 'getById'>

    beforeEach(() => {
        vi.clearAllMocks()
        bucket = { generateSignedUrl: vi.fn() }
        certificateRepository = { getById: vi.fn() }
    })

    function makeUseCase() {
        return new CreateWriteBucketSignedUrlUseCase(
            bucket,
            certificateRepository,
        )
    }

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        vi.mocked(certificateRepository.getById).mockResolvedValue(null)

        await expect(
            makeUseCase().execute({
                userId: USER_ID,
                certificateId: CERTIFICATE_ID,
                fileName: 'template.docx',
                mimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
                type: 'TEMPLATE',
            }),
        ).rejects.toThrow(CertificateNotFoundError)
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        vi.mocked(certificateRepository.getById).mockResolvedValue(
            createCertificateEmission({ userId: 'outro-usuario' }),
        )

        await expect(
            makeUseCase().execute({
                userId: USER_ID,
                certificateId: CERTIFICATE_ID,
                fileName: 'template.docx',
                mimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
                type: 'TEMPLATE',
            }),
        ).rejects.toThrow(NotCertificateOwnerError)
    })

    it('deve gerar URL assinada para upload de template PPTX', async () => {
        vi.mocked(certificateRepository.getById).mockResolvedValue(
            createCertificateEmission(),
        )
        vi.mocked(bucket.generateSignedUrl).mockResolvedValue(
            'https://signed-url/upload.pptx',
        )

        const result = await makeUseCase().execute({
            userId: USER_ID,
            certificateId: CERTIFICATE_ID,
            fileName: 'template.pptx',
            mimeType: TEMPLATE_FILE_MIME_TYPE.PPTX,
            type: 'TEMPLATE',
        })

        expect(bucket.generateSignedUrl).toHaveBeenCalledWith(
            expect.objectContaining({
                mimeType: TEMPLATE_FILE_MIME_TYPE.PPTX,
                action: 'write',
            }),
        )
        expect(result).toBe('https://signed-url/upload.pptx')
    })

    it('deve gerar URL assinada para upload de template DOCX', async () => {
        vi.mocked(certificateRepository.getById).mockResolvedValue(
            createCertificateEmission(),
        )
        vi.mocked(bucket.generateSignedUrl).mockResolvedValue(
            'https://signed-url/upload.docx',
        )

        const result = await makeUseCase().execute({
            userId: USER_ID,
            certificateId: CERTIFICATE_ID,
            fileName: 'template.docx',
            mimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
            type: 'TEMPLATE',
        })

        expect(bucket.generateSignedUrl).toHaveBeenCalledWith(
            expect.objectContaining({
                mimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
                action: 'write',
            }),
        )
        expect(result).toBe('https://signed-url/upload.docx')
    })
})
