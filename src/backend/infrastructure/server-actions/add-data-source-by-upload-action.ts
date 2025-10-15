'use server'

import { UnauthorizedError } from '@/backend/domain/error/unauthorized-error'
import { cookies } from 'next/headers'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { PrismaCertificatesRepository } from '../repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '../repository/prisma/prisma-sessions-repository'
import z from 'zod'
import { revalidateTag } from 'next/cache'
import { AddDataSourceByUploadUseCase } from '@/backend/application/add-data-source-by-upload-use-case'
import { SpreadsheetContentExtractorFactory } from '../factory/spreadsheet-content-extractor-factory'

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
            throw new UnauthorizedError('missing-session')
        }

        const parsedData = addDataSourceByUploadActionSchema.parse(rawData)

        const bucket = new GcpBucket()
        const certificatesRepository = new PrismaCertificatesRepository()
        const sessionsRepository = new PrismaSessionsRepository()
        const spreadsheetContentExtractorFactory =
            new SpreadsheetContentExtractorFactory()

        const addDataSourceByUploadUseCase = new AddDataSourceByUploadUseCase(
            bucket,
            sessionsRepository,
            certificatesRepository,
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
            message: 'Ocorreu um erro ao definir o template. Tente novamente.',
        }
    }

    revalidateTag('certificate')

    return {
        success: true,
        message: 'Template definido com sucesso',
    }
}
