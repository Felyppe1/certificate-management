import { describe, expect, it } from 'vitest'
import { CERTIFICATE_STATUS } from '../domain/certificate'
import {
    GetFileMetadataOutput,
    IGoogleDriveGateway,
} from './interfaces/igoogle-drive-gateway'
import { TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import {
    IFileContentExtractorFactory,
    IFileContentExtractorStrategy,
} from './interfaces/ifile-content-extractor-factory'
import { IBucket } from './interfaces/cloud/ibucket'
import { IStringVariableExtractor } from './interfaces/istring-variable-extractor'
import { PrismaCertificatesRepository } from '../infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '../infrastructure/repository/prisma/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '../infrastructure/repository/prisma/prisma-transaction-manager'
import { PrismaUsersRepository } from '../infrastructure/repository/prisma/prisma-users-repository'
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

        await prisma.certificateEmission.create({
            data: {
                id: '1',
                title: 'Name',
                user_id: '1',
                status: CERTIFICATE_STATUS.DRAFT,
            },
        })

        class GoogleDriveGatewayStub
            implements
                Pick<IGoogleDriveGateway, 'getFileMetadata' | 'downloadFile'>
        {
            async getFileMetadata(): Promise<GetFileMetadataOutput> {
                return {
                    name: 'filename',
                    fileMimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
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
                        return '{{name}} {{email}}'
                    },
                }
            }
        }

        class BucketStub implements Pick<IBucket, 'uploadObject'> {
            async uploadObject(): Promise<string> {
                return ''
            }
        }

        const stringVariableExtractorStub: Pick<
            IStringVariableExtractor,
            'extractVariables'
        > = {
            extractVariables: () => ['name', 'email'],
        }

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            new PrismaCertificatesRepository(prisma),
            new PrismaDataSourceRowsRepository(prisma),
            new GoogleDriveGatewayStub(),
            new FileContentExtractorFactoryStub(),
            new BucketStub(),
            new PrismaTransactionManager(prisma),
            stringVariableExtractorStub,
            new PrismaUsersRepository(prisma),
        )

        await addTemplateByUrlUseCase.execute({
            certificateId: '1',
            userId: '1',
            fileUrl: 'https://drive.google.com/file/d/abc123/view',
        })

        const template = await prisma.template.findFirst({
            where: { certificate_emission_id: '1' },
        })

        expect(template).toBeDefined()
        expect(template?.file_name).toBe('filename')
    })
})
