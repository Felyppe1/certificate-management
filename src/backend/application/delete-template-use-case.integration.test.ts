import { describe, expect, it } from 'vitest'
import { INPUT_METHOD } from '@/backend/domain/certificate'
import { TEMPLATE_FILE_MIME_TYPE } from '@/backend/domain/template'
import { IBucket } from '@/backend/application/interfaces/cloud/ibucket'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaDataSourceRowsRepository } from '@/backend/infrastructure/repository/prisma/prisma-data-source-rows-repository'
import { PrismaTransactionManager } from '@/backend/infrastructure/repository/prisma/prisma-transaction-manager'
import { CERTIFICATE_STATUS } from '@/backend/domain/certificate'
import { DeleteTemplateUseCase } from '@/backend/application/delete-template-use-case'
import { prisma } from '@/tests/setup.integration'

describe('DeleteTemplateUseCase (Integration)', () => {
    it('should delete a template successfully', async () => {
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
                Template: {
                    create: {
                        file_extension: TEMPLATE_FILE_MIME_TYPE.DOCX,
                        file_name: 'filename',
                        input_method: INPUT_METHOD.URL,
                        drive_file_id: '1',
                        thumbnail_url: null,
                        storage_file_url: 'https://storage-url',
                    },
                },
            },
        })

        class BucketStub implements Pick<IBucket, 'deleteObject'> {
            async deleteObject() {}
        }

        const deleteTemplateUseCase = new DeleteTemplateUseCase(
            new PrismaCertificatesRepository(prisma),
            new PrismaDataSourceRowsRepository(prisma),
            new BucketStub(),
            new PrismaTransactionManager(prisma),
        )

        await deleteTemplateUseCase.execute({
            certificateId: '1',
            userId: '1',
        })

        const template = await prisma.template.findFirst({
            where: { certificate_emission_id: '1' },
        })

        expect(template).toBeNull()
    })
})
