import { describe, expect, it } from 'vitest'
import { AddTemplateByUrlUseCase } from './add-template-by-url-use-case'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { Certificate, CERTIFICATE_STATUS } from '../domain/certificate'
import { Session, ISessionsRepository } from './interfaces/isessions-repository'
import {
    DownloadFileInput,
    GetFileMetadataInput,
    GetFileMetadataOutput,
    IGoogleDriveGateway,
} from './interfaces/igoogle-drive-gateway'
import { TEMPLATE_FILE_EXTENSION } from '../domain/template'
import {
    IFileContentExtractorStrategy,
    IFileContentExtractorFactory,
} from './interfaces/ifile-content-extractor'

describe('AddTemplateByUrlUseCase', () => {
    it('should add a template by URL successfully', async () => {
        class CertificateEmissionsRepositoryStub
            implements Pick<ICertificatesRepository, 'getById' | 'update'>
        {
            async getById(id: string): Promise<Certificate | null> {
                return new Certificate({
                    id: id,
                    name: 'Name',
                    userId: '1',
                    template: null,
                    createdAt: new Date(),
                    status: CERTIFICATE_STATUS.DRAFT,
                })
            }

            async update(): Promise<void> {
                return
            }
        }

        class SessionsRepositoryStub
            implements Pick<ISessionsRepository, 'getById'>
        {
            async getById(id: string): Promise<Session | null> {
                return {
                    id: id,
                    token: '1',
                    userId: '1',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                } as Session
            }
        }

        class GoogleDriveGatewayStub
            implements
                Pick<IGoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
        {
            async getFileMetadata(
                input: GetFileMetadataInput,
            ): Promise<GetFileMetadataOutput> {
                return {
                    name: 'filename',
                    fileExtension: TEMPLATE_FILE_EXTENSION.DOCX,
                }
            }

            async downloadFile(data: DownloadFileInput): Promise<Buffer> {
                return Buffer.from('file content')
            }
        }

        class FileContentExtractorFactoryStub
            implements Pick<IFileContentExtractorFactory, 'create'>
        {
            create(
                mimeType: TEMPLATE_FILE_EXTENSION,
            ): IFileContentExtractorStrategy {
                return {
                    async extractText(buffer: Buffer): Promise<string> {
                        return 'file content'
                    },
                }
            }
        }

        const certificateEmissionsRepositoryStub =
            new CertificateEmissionsRepositoryStub()
        const sessionsRepositoryStub = new SessionsRepositoryStub()
        const googleDriveGatewayStub = new GoogleDriveGatewayStub()
        const fileContentExtractorFactoryStub =
            new FileContentExtractorFactoryStub()

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepositoryStub,
            sessionsRepositoryStub,
            googleDriveGatewayStub,
            fileContentExtractorFactoryStub,
        )

        expect(
            async () =>
                await addTemplateByUrlUseCase.execute({
                    certificateId: '1',
                    fileUrl: 'https://drive.google.com/file/d/1/view',
                    sessionToken: '1',
                }),
        ).not.toThrow()
    })
})
