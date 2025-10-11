'use server'

import { AddTemplateByDrivePickerUseCase } from '@/backend/application/add-template-by-drive-picker-use-case'
import { UnauthorizedError } from '@/backend/domain/error/unauthorized-error'
import { FileContentExtractorFactory } from '@/backend/infrastructure/factory/file-content-extractor-factory'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { HttpGoogleDriveGateway } from '@/backend/infrastructure/gateway/http-google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { revalidateTag } from 'next/cache'
import { cookies } from 'next/headers'
import z from 'zod'
import { logoutAction } from './logout-action'

const addTemplateByDrivePickerActionSchema = z.object({
    certificateId: z.string().min(1, 'ID do certificado é obrigatório'),
    fileId: z.string().min(1, 'ID do arquivo é obrigatório'),
})

export async function addTemplateByDrivePickerAction(
    _: unknown,
    formData: FormData,
) {
    setTimeout(() => {
        // This is a workaround to make the action asynchronous
    }, 2000)
    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')?.value

    const rawData = {
        certificateId: formData.get('certificateId') as string,
        fileId: formData.get('fileId') as string,
    }

    try {
        if (!sessionToken) {
            throw new UnauthorizedError('missing-session')
        }

        const parsedData = addTemplateByDrivePickerActionSchema.parse(rawData)

        const sessionsRepository = new PrismaSessionsRepository()
        const certificateEmissionsRepository =
            new PrismaCertificatesRepository()
        const googleDriveGateway = new HttpGoogleDriveGateway()
        const fileContentExtractorFactory = new FileContentExtractorFactory()
        const externalUserAccountsRepository =
            new PrismaExternalUserAccountsRepository()
        const googleAuthGateway = new GoogleAuthGateway()

        const addTemplateByDrivePickerUseCase =
            new AddTemplateByDrivePickerUseCase(
                certificateEmissionsRepository,
                sessionsRepository,
                googleDriveGateway,
                fileContentExtractorFactory,
                externalUserAccountsRepository,
                googleAuthGateway,
            )

        await addTemplateByDrivePickerUseCase.execute({
            certificateId: rawData.certificateId,
            fileId: parsedData.fileId,
            sessionToken,
        })
    } catch (error: any) {
        console.log(error)

        if (error instanceof UnauthorizedError) {
            await logoutAction()
        }

        return {
            success: false,
            message: 'Erro ao adicionar template',
        }
    }

    revalidateTag('certificate')

    return {
        success: true,
        message: 'Template adicionado com sucesso',
    }
}
