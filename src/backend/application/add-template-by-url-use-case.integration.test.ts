import { describe, expect, it } from 'vitest'
import { CERTIFICATE_STATUS } from '../domain/certificate'
import {
    GetFileMetadataOutput,
    IGoogleDriveGateway,
} from './interfaces/igoogle-drive-gateway'
import { INPUT_METHOD, TEMPLATE_FILE_EXTENSION } from '../domain/template'
import {
    IFileContentExtractorFactory,
    IFileContentExtractorStrategy,
} from './interfaces/ifile-content-extractor'
import { IBucket } from './interfaces/ibucket'
import { PrismaCertificatesRepository } from '../infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '../infrastructure/repository/prisma/prisma-sessions-repository'
import { AddTemplateByUrlUseCase } from './add-template-by-url-use-case'
import { prisma } from '@/tests/setup.integration'

describe('AddTemplateByUrlUseCase (Integration)', () => {
    it('should create a template by url successfully', async () => {
        await prisma.user.create({
            data: {
                id: '1',
                email: 'user@gmail.com',
                password_hash: 'password',
                name: 'User',
            },
        })

        await prisma.session.create({
            data: {
                token: '1',
                user_id: '1',
            },
        })

        await prisma.certificateEmission.createMany({
            data: [
                {
                    id: '1',
                    title: 'Name',
                    user_id: '1',
                    status: CERTIFICATE_STATUS.DRAFT,
                },
            ],
        })

        class GoogleDriveGatewayStub
            implements
                Pick<IGoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
        {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'filename',
                    fileExtension: TEMPLATE_FILE_EXTENSION.DOCX,
                    thumbnailUrl: null,
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

        class BucketStub implements Pick<IBucket, 'deleteObject'> {
            async deleteObject() {}
        }

        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const googleDriveGatewayStub = new GoogleDriveGatewayStub()
        const fileContentExtractorFactoryStub =
            new FileContentExtractorFactoryStub()
        const bucketStub = new BucketStub()

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepository,
            sessionsRepository,
            googleDriveGatewayStub,
            fileContentExtractorFactoryStub,
            bucketStub,
        )

        await addTemplateByUrlUseCase.execute({
            certificateId: '1',
            sessionToken: '1',
            fileUrl: 'https://drive.google.com/file/d/1/view?usp=sharing',
        })

        const template = await prisma.template.findFirst({
            where: {
                certificate_emission_id: '1',
            },
        })

        expect(template).toBeDefined()
    })
})
