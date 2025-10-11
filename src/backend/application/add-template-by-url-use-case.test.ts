import { describe, expect, it, vi } from 'vitest'
import { AddTemplateByUrlUseCase } from './add-template-by-url-use-case'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { Certificate, CERTIFICATE_STATUS } from '../domain/certificate'
import { Session, ISessionsRepository } from './interfaces/isessions-repository'
import {
    GetFileMetadataOutput,
    IGoogleDriveGateway,
} from './interfaces/igoogle-drive-gateway'
import { TEMPLATE_FILE_EXTENSION } from '../domain/template'
import {
    IFileContentExtractorStrategy,
    IFileContentExtractorFactory,
} from './interfaces/ifile-content-extractor'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { NotFoundError } from '../domain/error/not-found-error'
import { ValidationError } from '../domain/error/validation-error'

describe('AddTemplateByUrlUseCase', () => {
    function createSession(id: string) {
        return {
            id,
            token: '1',
            userId: '1',
            createdAt: new Date(),
            updatedAt: new Date(),
        }
    }

    function createCertificateEmission(id: string) {
        return new Certificate({
            id,
            name: 'Name',
            userId: '1',
            template: null,
            createdAt: new Date(),
            status: CERTIFICATE_STATUS.DRAFT,
        })
    }

    it('should add a template by URL successfully', async () => {
        const certificateEmissionsRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi
                .fn()
                .mockImplementation((id: string) =>
                    Promise.resolve(createCertificateEmission(id)),
                ),
            update: vi.fn(),
        }

        class SessionsRepositoryStub
            implements Pick<ISessionsRepository, 'getById'>
        {
            async getById(id: string): Promise<Session | null> {
                return createSession(id)
            }
        }

        class GoogleDriveGatewayStub
            implements
                Pick<IGoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
        {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'filename',
                    fileExtension: TEMPLATE_FILE_EXTENSION.DOCX,
                }
            }

            async downloadFile(): Promise<Buffer> {
                return Buffer.from('file content')
            }
        }

        class FileContentExtractorFactoryStub
            implements Pick<IFileContentExtractorFactory, 'create'>
        {
            create(): IFileContentExtractorStrategy {
                return {
                    async extractText(): Promise<string> {
                        return 'file content'
                    },
                }
            }
        }

        const sessionsRepositoryStub = new SessionsRepositoryStub()
        const googleDriveGatewayStub = new GoogleDriveGatewayStub()
        const fileContentExtractorFactoryStub =
            new FileContentExtractorFactoryStub()

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepositoryMock,
            sessionsRepositoryStub,
            googleDriveGatewayStub,
            fileContentExtractorFactoryStub,
        )

        await expect(
            addTemplateByUrlUseCase.execute({
                certificateId: '1',
                fileUrl: 'https://drive.google.com/file/d/1/view',
                sessionToken: '1',
            }),
        ).resolves.not.toThrow()

        expect(certificateEmissionsRepositoryMock.getById).toHaveBeenCalledWith(
            '1',
        )
        expect(certificateEmissionsRepositoryMock.update).toHaveBeenCalled()

        const updateMock =
            certificateEmissionsRepositoryMock.update as ReturnType<
                typeof vi.fn
            >
        const updateCallArg = updateMock.mock.calls[0][0] as Certificate
        expect(updateCallArg.hasTemplate()).toBe(true)
    })

    it('should throw an unauthorized error when session is not found', async () => {
        class SessionsRepositoryStub
            implements Pick<ISessionsRepository, 'getById'>
        {
            async getById(): Promise<Session | null> {
                return null
            }
        }

        const sessionsRepositoryStub = new SessionsRepositoryStub()

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            {} as ICertificatesRepository,
            sessionsRepositoryStub,
            {} as IGoogleDriveGateway,
            {} as IFileContentExtractorFactory,
        )

        await expect(
            addTemplateByUrlUseCase.execute({
                certificateId: '1',
                fileUrl: 'https://drive.google.com/file/d/1/view',
                sessionToken: 'invalid-session-token',
            }),
        ).rejects.toThrow(UnauthorizedError)
    })

    it('should throw a not found error when certificate is not found', async () => {
        const certificateEmissionsRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }

        class SessionsRepositoryStub
            implements Pick<ISessionsRepository, 'getById'>
        {
            async getById(id: string): Promise<Session | null> {
                return createSession(id)
            }
        }

        const sessionsRepositoryStub = new SessionsRepositoryStub()

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepositoryMock,
            sessionsRepositoryStub,
            {} as IGoogleDriveGateway,
            {} as IFileContentExtractorFactory,
        )

        await expect(
            addTemplateByUrlUseCase.execute({
                certificateId: 'invalid-id',
                fileUrl: 'https://drive.google.com/file/d/1/view',
                sessionToken: '1',
            }),
        ).rejects.toThrow(NotFoundError)

        expect(certificateEmissionsRepositoryMock.getById).toHaveBeenCalledWith(
            'invalid-id',
        )
        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('should throw a validation error when cannot get the file id from the url', async () => {
        const certificateEmissionsRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi
                .fn()
                .mockImplementation((id: string) =>
                    Promise.resolve(createCertificateEmission(id)),
                ),
            update: vi.fn(),
        }

        class SessionsRepositoryStub
            implements Pick<ISessionsRepository, 'getById'>
        {
            async getById(id: string): Promise<Session | null> {
                return createSession(id)
            }
        }

        const sessionsRepositoryStub = new SessionsRepositoryStub()

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepositoryMock,
            sessionsRepositoryStub,
            {} as IGoogleDriveGateway,
            {} as IFileContentExtractorFactory,
        )

        await expect(
            addTemplateByUrlUseCase.execute({
                certificateId: '1',
                fileUrl: 'https://invalid-url.com',
                sessionToken: '1',
            }),
        ).rejects.toThrow(ValidationError)

        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })
})
