'use server'

import { AddTemplateByUrlUseCase } from '@/backend/application/add-template-by-url-use-case'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { FileContentExtractorFactory } from '@/backend/infrastructure/factory/file-content-extractor-factory'
import { GoogleAuthGateway } from '@/backend/infrastructure/gateway/google-auth-gateway'
import { GoogleDriveGateway } from '@/backend/infrastructure/gateway/google-drive-gateway'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { updateTag } from 'next/cache'
import { cookies } from 'next/headers'
import z, { ZodError } from 'zod'
import { logoutAction } from './logout-action'
import { GcpBucket } from '../cloud/gcp/gcp-bucket'
import { NotFoundError } from '@/backend/domain/error/not-found-error'
import { PrismaDataSetsRepository } from '../repository/prisma/prisma-data-sets-repository'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '@/backend/domain/error/validation-error'
import { ActionResponse } from '@/types'

interface AddTemplateByUrlActionInput {
    certificateId: string
    fileUrl: string
}

const addTemplateByUrlActionSchema = z.object({
    certificateId: z.string().min(1, 'ID do certificado é obrigatório'),
    fileUrl: z.url('URL do arquivo inválida'),
})

export async function addTemplateByUrlAction(
    _: unknown,
    formData: FormData,
): Promise<ActionResponse<AddTemplateByUrlActionInput>> {
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

        const parsedData = addTemplateByUrlActionSchema.parse(rawData)

        const sessionsRepository = new PrismaSessionsRepository(prisma)
        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
        const dataSetsRepository = new PrismaDataSetsRepository(prisma)
        const googleAuthGateway = new GoogleAuthGateway()
        const googleDriveGateway = new GoogleDriveGateway(googleAuthGateway)
        const fileContentExtractorFactory = new FileContentExtractorFactory()
        const bucket = new GcpBucket()

        const addTemplateByUrlUseCase = new AddTemplateByUrlUseCase(
            certificateEmissionsRepository,
            dataSetsRepository,
            sessionsRepository,
            googleDriveGateway,
            fileContentExtractorFactory,
            bucket,
        )

        await addTemplateByUrlUseCase.execute({
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

        if (error instanceof ZodError) {
            return {
                success: false,
                message: 'Por favor, corrija os erros no formulário.',
                errors: z.flattenError(
                    error as ZodError<AddTemplateByUrlActionInput>,
                ).fieldErrors,
                inputs: rawData,
            }
        }

        if (error instanceof AuthenticationError) {
            await logoutAction()
        }

        if (error instanceof NotFoundError) {
            if (error.type === 'drive-file-not-found') {
                return {
                    success: false,
                    message:
                        'Arquivo não encontrado. Verifique se a URL está correta e se o arquivo no Drive está público',
                }
            }
        }

        if (error instanceof ValidationError) {
            if (
                error.type ===
                VALIDATION_ERROR_TYPE.UNSUPPORTED_TEMPLATE_MIMETYPE
            ) {
                return {
                    success: false,
                    message:
                        'Tipo de arquivo não suportado. Apenas Google Slides, Google Docs, .pptx ou .docx são permitidos',
                }
            } else if (
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
            message: 'Ocorreu um erro ao tentar adicionar template',
        }
    }

    updateTag('certificate')

    return {
        success: true,
        message: 'Template adicionado com sucesso',
    }
    // redirect('/templates/' + newTemplateId)
}
