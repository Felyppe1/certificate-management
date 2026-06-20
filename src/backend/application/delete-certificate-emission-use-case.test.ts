import { beforeEach, describe, expect, it, Mock, vi } from 'vitest'
import { DeleteCertificateEmissionUseCase } from './delete-certificate-emission-use-case'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IBucket } from './interfaces/cloud/ibucket'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { Template, TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import { DataSource, DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'

describe('DeleteCertificateEmissionUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'
    const TEMPLATE_STORAGE_URL = 'users/1/certificates/1/template.docx'
    const DATASOURCE_STORAGE_URL = 'https://storage/dados.csv'

    function createTemplate() {
        return new Template({
            fileMimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
            inputMethod: INPUT_METHOD.UPLOAD,
            driveFileId: null,
            storageFileUrl: TEMPLATE_STORAGE_URL,
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
                    storageFileUrl: DATASOURCE_STORAGE_URL,
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
            name: 'Meu Certificado',
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

    let certificatesRepositoryMock: {
        getById: Mock<ICertificatesRepository['getById']>
        delete: Mock<ICertificatesRepository['delete']>
    }

    let bucketMock: {
        deleteObject: Mock<IBucket['deleteObject']>
    }

    beforeEach(() => {
        certificatesRepositoryMock = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            delete: vi.fn(),
        }

        bucketMock = {
            deleteObject: vi.fn().mockResolvedValue(undefined),
        }
    })

    it('deve deletar a emissão com template e sem fonte de dados com sucesso', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({
                template: createTemplate(),
                dataSource: null,
            }),
        )

        const useCase = new DeleteCertificateEmissionUseCase(
            certificatesRepositoryMock,
            bucketMock,
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            userId: USER_ID,
        })

        expect(certificatesRepositoryMock.delete).toHaveBeenCalledWith(
            CERTIFICATE_ID,
        )
        expect(bucketMock.deleteObject).toHaveBeenCalledTimes(1)
        expect(bucketMock.deleteObject).toHaveBeenCalledWith(
            expect.objectContaining({ objectName: TEMPLATE_STORAGE_URL }),
        )
    })

    it('deve deletar a emissão com fonte de dados e sem template com sucesso', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({
                template: null,
                dataSource: createDataSource(),
            }),
        )

        const useCase = new DeleteCertificateEmissionUseCase(
            certificatesRepositoryMock,
            bucketMock,
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            userId: USER_ID,
        })

        expect(certificatesRepositoryMock.delete).toHaveBeenCalledWith(
            CERTIFICATE_ID,
        )
        expect(bucketMock.deleteObject).toHaveBeenCalledTimes(1)
        expect(bucketMock.deleteObject).toHaveBeenCalledWith(
            expect.objectContaining({ objectName: DATASOURCE_STORAGE_URL }),
        )
    })

    it('deve deletar a emissão sem template e sem fonte de dados com sucesso', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ template: null, dataSource: null }),
        )

        const useCase = new DeleteCertificateEmissionUseCase(
            certificatesRepositoryMock,
            bucketMock,
        )

        await useCase.execute({
            certificateId: CERTIFICATE_ID,
            userId: USER_ID,
        })

        expect(certificatesRepositoryMock.delete).toHaveBeenCalledWith(
            CERTIFICATE_ID,
        )
        expect(bucketMock.deleteObject).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(null)

        const useCase = new DeleteCertificateEmissionUseCase(
            certificatesRepositoryMock,
            {} as IBucket,
        )

        await expect(
            useCase.execute({ certificateId: 'nao-existe', userId: USER_ID }),
        ).rejects.toThrow(CertificateNotFoundError)

        expect(certificatesRepositoryMock.delete).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ userId: 'outro-usuario' }),
        )

        const useCase = new DeleteCertificateEmissionUseCase(
            certificatesRepositoryMock,
            {} as IBucket,
        )

        await expect(
            useCase.execute({ certificateId: CERTIFICATE_ID, userId: USER_ID }),
        ).rejects.toThrow(NotCertificateOwnerError)

        expect(certificatesRepositoryMock.delete).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a emissão de certificado já tiver sido emitida', async () => {
        certificatesRepositoryMock.getById.mockResolvedValue(
            createCertificateEmission({ status: CERTIFICATE_STATUS.EMITTED }),
        )

        const useCase = new DeleteCertificateEmissionUseCase(
            certificatesRepositoryMock,
            {} as IBucket,
        )

        await expect(
            useCase.execute({ certificateId: CERTIFICATE_ID, userId: USER_ID }),
        ).rejects.toThrow(CertificateEmittedError)

        expect(certificatesRepositoryMock.delete).not.toHaveBeenCalled()
    })
})
