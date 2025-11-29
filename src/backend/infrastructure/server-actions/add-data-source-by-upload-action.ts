'use server'

import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { cookies } from 'next/headers'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '../repository/prisma/prisma-sessions-repository'
import z from 'zod'
import { revalidateTag } from 'next/cache'
import { AddDataSourceByUploadUseCase } from '@/backend/application/add-data-source-by-upload-use-case'
import { SpreadsheetContentExtractorFactory } from '../factory/spreadsheet-content-extractor-factory'
import { PrismaDataSetsRepository } from '../repository/prisma/prisma-data-sets-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'

const MAXIMUM_FILE_SIZE = 5 * 1024 * 1024

const addDataSourceByUploadActionSchema = z.object({
    certificateId: z.string().min(1, 'Certificate ID is required'),
    file: z.instanceof(File).refine(file => file.size <= MAXIMUM_FILE_SIZE, {
        message: 'File size must be less than 5MB',
    }),
})

export async function addDataSourceByUploadAction(
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

        const parsedData = addDataSourceByUploadActionSchema.parse(rawData)

        const bucket = new GcpBucket()
        const certificatesRepository = new PrismaCertificatesRepository(prisma)
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const spreadsheetContentExtractorFactory =
            new SpreadsheetContentExtractorFactory()

        const addDataSourceByUploadUseCase = new AddDataSourceByUploadUseCase(
            bucket,
            sessionsRepository,
            certificatesRepository,
            dataSetsRepository,
            spreadsheetContentExtractorFactory,
        )

        await addDataSourceByUploadUseCase.execute({
            sessionToken,
            certificateId: parsedData.certificateId,
            file: parsedData.file,
        })
    } catch (error: any) {
        console.error(error)
        // throw error

        return {
            success: false,
            message: 'Ocorreu um erro ao tentar fazer upload da fonte de dados',
        }
    }

    revalidateTag('certificate')

    return {
        success: true,
        message: 'Base de dados definida com sucesso',
    }
}
