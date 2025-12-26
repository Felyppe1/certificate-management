'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { cookies } from 'next/headers'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '../repository/prisma/prisma-sessions-repository'
import { prisma } from '../repository/prisma'
import z from 'zod'
import { AddTemplateByUploadUseCase } from '@/backend/application/add-template-by-upload-use-case'
import { FileContentExtractorFactory } from '../factory/file-content-extractor-factory'
import { updateTag } from 'next/cache'
import { PrismaDataSetsRepository } from '../repository/prisma/prisma-data-sets-repository'
import { logoutAction } from './logout-action'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '@/backend/domain/error/validation-error'
import { PrismaTransactionManager } from '../repository/prisma/prisma-transaction-manager'

const MAXIMUM_FILE_SIZE = 5 * 1024 * 1024

const addTemplateByUploadActionActionSchema = z.object({
    certificateId: z.string().min(1, 'Certificate ID is required'),
    file: z.instanceof(File).refine(file => file.size <= MAXIMUM_FILE_SIZE, {
        message: 'File size must be less than 5MB',
    }),
})

export async function addTemplateByUploadAction(
    _: unknown,
    formData: FormData,
) {
    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')?.value

    const rawData = {
        certificateId: formData.get('certificateId') as string,
        file: formData.get('file') as File,
    }

    try {
        if (!sessionToken) {
            throw new AuthenticationError('missing-session')
        }

        const parsedData = addTemplateByUploadActionActionSchema.parse(rawData)

        const bucket = new GcpBucket()
        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const fileContentExtractorFactory = new FileContentExtractorFactory()
        const transactionManager = new PrismaTransactionManager(prisma)

        const addTemplateByUploadUseCase = new AddTemplateByUploadUseCase(
            bucket,
            sessionsRepository,
            certificatesRepository,
            dataSetsRepository,
            fileContentExtractorFactory,
            transactionManager,
        )

        await addTemplateByUploadUseCase.execute({
            sessionToken,
            certificateId: parsedData.certificateId,
            file: parsedData.file,
        })
    } catch (error: any) {
        console.error(error)
        // throw error
        if (error instanceof AuthenticationError) {
            await logoutAction()
        }

        if (error instanceof ValidationError) {
            if (
                error.type ===
                VALIDATION_ERROR_TYPE.TEMPLATE_VARIABLES_PARSING_ERROR
            ) {
                return {
                    success: false,
                    message:
                        'Foi encontrado um erro de sintaxe do Liquid no template.',
                }
            }
        }

        return {
            success: false,
            message: 'Ocorreu um erro ao tentar fazer upload do template',
        }
    }

    updateTag('certificate')

    return {
        success: true,
        message: 'Template definido com sucesso',
    }
}
