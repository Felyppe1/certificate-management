import { describe, expect, it } from 'vitest'
import {
    INPUT_METHOD,
    TEMPLATE_FILE_EXTENSION,
} from '@/backend/domain/template'
import { IBucket } from '@/backend/application/interfaces/ibucket'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { CERTIFICATE_STATUS } from '@/backend/domain/certificate'
import { DeleteTemplateUseCase } from '@/backend/application/delete-template-use-case'

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

        await prisma.session.create({
            data: {
                token: '1',
                user_id: '1',
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
                        id: '1',
                        file_extension: TEMPLATE_FILE_EXTENSION.DOCX,
                        file_name: 'filename',
                        input_method: INPUT_METHOD.URL,
                        drive_file_id: '1',
                        thumbnail_url: null,
                        storage_file_url: null,
                    },
                },
            },
        })

        class BucketStub implements Pick<IBucket, 'deleteObject'> {
            async deleteObject() {}
        }

        const certificateEmissionsRepository =
            new PrismaCertificatesRepository()
        const sessionsRepository = new PrismaSessionsRepository()
        const bucketStub = new BucketStub()

        const deleteTemplateUseCase = new DeleteTemplateUseCase(
            certificateEmissionsRepository,
            sessionsRepository,
            bucketStub,
        )

        await deleteTemplateUseCase.execute({
            certificateId: '1',
            sessionToken: '1',
        })

        const template = await prisma.template.findFirst({
            where: {
                certificate_emission_id: '1',
            },
        })

        expect(template).toBeNull()
    })
})
