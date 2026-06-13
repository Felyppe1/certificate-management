import { describe, expect, it, vi } from 'vitest'
import { AddTemplateByUploadUseCase } from './add-template-by-upload-use-case'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IStringVariableExtractor } from './interfaces/istring-variable-extractor'
import {
    IFileContentExtractorFactory,
    IFileContentExtractorStrategy,
} from './interfaces/ifile-content-extractor-factory'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { IBucket } from './interfaces/cloud/ibucket'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { DataSource, DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
import { TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import { User } from '../domain/user'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { UnsupportedTemplateMimetypeError } from '../domain/error/validation-error/unsupported-template-mimetype-error'

describe('AddTemplateByUploadUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'

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
            columns: [{ name: 'Nome', type: 'string' as const, arrayMetadata: null }],
            googleAccountEmail: null,
        })
    }

    function createCertificateEmission(overrides?: {
        userId?: string
        status?: CERTIFICATE_STATUS
        dataSource?: DataSource | null
    }) {
        return new CertificateEmission({
            id: CERTIFICATE_ID,
            name: 'Name',
            userId: overrides?.userId ?? USER_ID,
            template: null,
            createdAt: new Date(),
            status: overrides?.status ?? CERTIFICATE_STATUS.DRAFT,
            dataSource: overrides?.dataSource ?? null,
            variableColumnMapping: null,
        })
    }

    function createValidFile(mimeType = TEMPLATE_FILE_MIME_TYPE.DOCX as string) {
        return new File([Buffer.from('content')], 'template.docx', {
            type: mimeType,
        })
    }

    class BucketStub implements Pick<IBucket, 'uploadObject'> {
        async uploadObject(): Promise<string> {
            return ''
        }
    }

    class TransactionManagerStub implements Pick<ITransactionManager, 'run'> {
        async run<T>(work: () => Promise<T>): Promise<T> {
            return work()
        }
    }

    class FileContentExtractorFactoryStub
        implements Pick<IFileContentExtractorFactory, 'create'>
    {
        create(): IFileContentExtractorStrategy {
            return {
                async extractText(): Promise<string> {
                    return '{{nome}}'
                },
            }
        }
    }

    class UsersRepositoryStub implements Pick<IUsersRepository, 'getById'> {
        async getById(): Promise<User | null> {
            return null
        }
    }

    it('deve adicionar um template por upload com sucesso', async () => {
        const certificateEmission = createCertificateEmission()

        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(certificateEmission),
            update: vi.fn(),
        }

        const dataSourceRowsRepositoryStub: Pick<
            IDataSourceRowsRepository,
            'resetProcessingStatusByCertificateEmissionId'
        > = {
            resetProcessingStatusByCertificateEmissionId: vi.fn(),
        }

        const useCase = new AddTemplateByUploadUseCase(
            new BucketStub(),
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            new FileContentExtractorFactoryStub(),
            new TransactionManagerStub(),
            { extractVariables: () => ['nome'] },
            new UsersRepositoryStub(),
        )

        await useCase.execute({
            file: createValidFile(),
            certificateId: CERTIFICATE_ID,
            userId: USER_ID,
        })

        expect(certificatesRepositoryMock.update).toHaveBeenCalledWith(
            certificateEmission,
        )
        expect(certificateEmission.hasTemplate()).toBe(true)
    })

    it('deve resetar o status de processamento das linhas da fonte de dados ao substituir o template quando houver fonte de dados vinculada', async () => {
        const certificateEmission = createCertificateEmission({
            dataSource: createDataSource(),
        })

        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(certificateEmission),
            update: vi.fn(),
        }

        const dataSourceRowsRepositoryStub: Pick<
            IDataSourceRowsRepository,
            'resetProcessingStatusByCertificateEmissionId'
        > = {
            resetProcessingStatusByCertificateEmissionId: vi.fn(),
        }

        const useCase = new AddTemplateByUploadUseCase(
            new BucketStub(),
            certificatesRepositoryMock,
            dataSourceRowsRepositoryStub,
            new FileContentExtractorFactoryStub(),
            new TransactionManagerStub(),
            { extractVariables: () => [] },
            new UsersRepositoryStub(),
        )

        await useCase.execute({
            file: createValidFile(),
            certificateId: CERTIFICATE_ID,
            userId: USER_ID,
        })

        expect(
            dataSourceRowsRepositoryStub.resetProcessingStatusByCertificateEmissionId,
        ).toHaveBeenCalledWith(CERTIFICATE_ID)
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }

        const useCase = new AddTemplateByUploadUseCase(
            {} as IBucket,
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IFileContentExtractorFactory,
            {} as ITransactionManager,
            {} as IStringVariableExtractor,
            {} as IUsersRepository,
        )

        await expect(
            useCase.execute({
                file: createValidFile(),
                certificateId: 'nao-existe',
                userId: USER_ID,
            }),
        ).rejects.toThrow(CertificateNotFoundError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi
                .fn()
                .mockResolvedValue(
                    createCertificateEmission({ userId: 'outro-usuario' }),
                ),
            update: vi.fn(),
        }

        const useCase = new AddTemplateByUploadUseCase(
            {} as IBucket,
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IFileContentExtractorFactory,
            {} as ITransactionManager,
            {} as IStringVariableExtractor,
            {} as IUsersRepository,
        )

        await expect(
            useCase.execute({
                file: createValidFile(),
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(NotCertificateOwnerError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a emissão de certificado já tiver sido emitida', async () => {
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(
                createCertificateEmission({ status: CERTIFICATE_STATUS.EMITTED }),
            ),
            update: vi.fn(),
        }

        const useCase = new AddTemplateByUploadUseCase(
            {} as IBucket,
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IFileContentExtractorFactory,
            {} as ITransactionManager,
            {} as IStringVariableExtractor,
            {} as IUsersRepository,
        )

        await expect(
            useCase.execute({
                file: createValidFile(),
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(CertificateEmittedError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o formato do arquivo não for suportado como template', async () => {
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        const useCase = new AddTemplateByUploadUseCase(
            {} as IBucket,
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IFileContentExtractorFactory,
            {} as ITransactionManager,
            {} as IStringVariableExtractor,
            {} as IUsersRepository,
        )

        const pdfFile = createValidFile('application/pdf')

        await expect(
            useCase.execute({
                file: pdfFile,
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(UnsupportedTemplateMimetypeError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })
})