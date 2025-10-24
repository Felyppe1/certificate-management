'use server'

import { FileUrlNotFoundError } from '@/backend/domain/error/file-url-not-found-error'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import z from 'zod'
import { logoutAction } from './logout-action'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { AddDataSourceByUrlUseCase } from '@/backend/application/add-data-source-by-url-use-case'
import { SpreadsheetContentExtractorFactory } from '../factory/spreadsheet-content-extractor-factory'
import { PrismaDataSetsRepository } from '../repository/prisma/prisma-data-sets-repository'

const addDataSourceByUrlActionSchema = z.object({
    certificateId: z.string().min(1, 'ID do certificado é obrigatório'),
    fileUrl: z.url('URL do arquivo inválida'),
})

export async function addDataSourceByUrlAction(_: unknown, formData: FormData) {
    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')?.value

    const rawData = {
        certificateId: formData.get('certificateId') as string,
        fileUrl: formData.get('fileUrl') as string,
    }

    // let newTemplateId: string

    try {
        if (!sessionToken) {
            throw new AuthenticationError('missing-session')
        }

        const parsedData = addDataSourceByUrlActionSchema.parse(rawData)

        const sessionsRepository = new PrismaSessionsRepository()
        const certificateEmissionsRepository =
            new PrismaCertificatesRepository()
        const dataSetsRepository = new PrismaDataSetsRepository()
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const spreadsheetContentExtractorFactory =
            new SpreadsheetContentExtractorFactory()
        const bucket = new GcpBucket()

        const addDataSourceByUrlUseCase = new AddDataSourceByUrlUseCase(
            certificateEmissionsRepository,
            dataSetsRepository,
            sessionsRepository,
            googleDriveGateway,
            spreadsheetContentExtractorFactory,
            bucket,
        )

        await addDataSourceByUrlUseCase.execute({
            certificateId: rawData.certificateId,
            fileUrl: parsedData.fileUrl,
            sessionToken,
        })
    } catch (error: any) {
        console.log(error)

        globalThis.logger?.emit({
            severityText: 'ERROR',
            body: 'Error adding template by URL',
            attributes: {
                err: error,
                message: 'Error adding template by URL',
                certificateId: rawData.certificateId,
            },
        })

        if (error instanceof AuthenticationError) {
            await logoutAction()
        }

        return {
            success: false,
            message:
                error instanceof FileUrlNotFoundError
                    ? 'Arquivo não encontrado'
                    : 'Ocorreu um erro ao adicionar template',
        }
    }

    revalidateTag('certificate')

    return {
        success: true,
        message: 'Template adicionado com sucesso',
    }
    // redirect('/templates/' + newTemplateId)
}
