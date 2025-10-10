import { describe, expect, it } from 'vitest'
import { AddTemplateByUrlUseCase } from './add-template-by-url-use-case'
import { CertificatesRepository } from './interfaces/certificates-repository'
import { Certificate, CERTIFICATE_STATUS } from '../domain/certificate'
import { Session, SessionsRepository } from './interfaces/sessions-repository'
import {
    DownloadFileInput,
    GetFileMetadataInput,
    GetFileMetadataOutput,
    GoogleDriveGateway,
} from './interfaces/google-drive-gateway'
import { TEMPLATE_FILE_EXTENSION } from '../domain/template'
import {
    FileContentExtractor,
    FileContentExtractorFactory,
} from './interfaces/file-content-extractor'

describe('AddTemplateByUrlUseCase', () => {
    it('should add a template by URL successfully', async () => {
        class CertificateEmissionsRepositoryStub
            implements Pick<CertificatesRepository, 'getById' | 'update'>
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
            implements Pick<SessionsRepository, 'getById'>
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
                Pick<GoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
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
            implements Pick<FileContentExtractorFactory, 'create'>
        {
            create(mimeType: TEMPLATE_FILE_EXTENSION): FileContentExtractor {
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
