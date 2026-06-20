import { describe, expect, it, beforeEach } from 'vitest'
import { PassThrough } from 'stream'
import { DownloadAllCertificateEmissionsUseCase } from './download-all-certificate-emissions-use-case'
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
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificatesNotGeneratedError } from '../domain/error/validation-error/certificates-not-generated-error'

describe('DownloadAllCertificateEmissionsUseCase', () => {
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

    let certificateRepositoryStub: Pick<ICertificatesRepository, 'getById'>
    let dataSourceRowsRepositoryStub: Pick<
        IDataSourceRowsRepository,
        'allRowsFinishedProcessing'
    >
    let bucketStub: Pick<IBucket, 'getObjectsWithPrefix'>

    beforeEach(() => {
        certificateRepositoryStub = {
            async getById() {
                return createCertificateEmission()
            },
        }

        dataSourceRowsRepositoryStub = {
            async allRowsFinishedProcessing() {
                return true
            },
        }

        bucketStub = {
            async getObjectsWithPrefix() {
                return [
                    {
                        name: `users/${USER_ID}/certificates/${CERTIFICATE_ID}/certificate-row-1.pdf`,
                        createReadStream: () => new PassThrough(),
                    },
                ]
            },
        }
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        certificateRepositoryStub.getById = async () => null

        const useCase = new DownloadAllCertificateEmissionsUseCase(
            {} as IBucket,
            certificateRepositoryStub,
            {} as IDataSourceRowsRepository,
        )

        await expect(
            useCase.execute({
                userId: USER_ID,
                certificateEmissionId: CERTIFICATE_ID,
            }),
        ).rejects.toThrow(CertificateNotFoundError)
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        certificateRepositoryStub.getById = async () =>
            createCertificateEmission({ userId: 'outro-usuario' })

        const useCase = new DownloadAllCertificateEmissionsUseCase(
            {} as IBucket,
            certificateRepositoryStub,
            {} as IDataSourceRowsRepository,
        )

        await expect(
            useCase.execute({
                userId: USER_ID,
                certificateEmissionId: CERTIFICATE_ID,
            }),
        ).rejects.toThrow(NotCertificateOwnerError)
    })

    it('deve lançar erro quando nem todos os certificados foram gerados', async () => {
        dataSourceRowsRepositoryStub.allRowsFinishedProcessing = async () =>
            false

        const useCase = new DownloadAllCertificateEmissionsUseCase(
            {} as IBucket,
            certificateRepositoryStub,
            dataSourceRowsRepositoryStub,
        )

        await expect(
            useCase.execute({
                userId: USER_ID,
                certificateEmissionId: CERTIFICATE_ID,
            }),
        ).rejects.toThrow(CertificatesNotGeneratedError)
    })

    it('deve retornar um stream para download no caminho feliz', async () => {
        const useCase = new DownloadAllCertificateEmissionsUseCase(
            bucketStub,
            certificateRepositoryStub,
            dataSourceRowsRepositoryStub,
        )

        const result = await useCase.execute({
            userId: USER_ID,
            certificateEmissionId: CERTIFICATE_ID,
        })

        expect(result).toBeTruthy()
        expect(result).toBeInstanceOf(PassThrough)
    })
})
