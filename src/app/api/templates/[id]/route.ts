// import { NextRequest, NextResponse } from 'next/server'
// // import { PrismaTemplatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-templates-repository'
// import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
// import { cookies } from 'next/headers'
// import { z } from 'zod'
// import { AuthenticationError } from '@/backend/domain/error/unauthorized-error'
// import { NotFoundError } from '@/backend/domain/error/not-found-error'
// import { ForbiddenError } from '@/backend/domain/error/forbidden-error'

// const getTemplateByIdSchema = z.object({
//     templateId: z.string().min(1, 'Template ID is required'),
// })

export async function GET() {
    // request: NextRequest,
    // { params }: { params: Promise<{ id: string }> },
    // const cookie = await cookies()
    // const { id: templateId } = await params
    // try {
    //     const sessionToken = cookie.get('session_token')?.value
    //     if (!sessionToken) {
    //         throw new AuthenticationError('Session token not present')
    //     }
    //     const parsedData = getTemplateByIdSchema.parse({ templateId })
    //     const sessionsRepository = new PrismaSessionsRepository()
    //     const templatesRepository = new PrismaTemplatesRepository()
    //     const session = await sessionsRepository.getById(sessionToken)
    //     if (!session) {
    //         throw new AuthenticationError('Session not found')
    //     }
    //     const template = await templatesRepository.getById(
    //         parsedData.templateId,
    //     )
    //     if (!template) {
    //         throw new NotFoundError('Template not found')
    //     }
    //     if (template.getUserId() !== session.userId) {
    //         throw new ForbiddenError(
    //             'You do not have permission to view this template',
    //         )
    //     }
    //     const serialized = template.serialize()
    //     return NextResponse.json({
    //         template: {
    //             id: serialized.id,
    //             fileName: serialized.fileName,
    //             fileExtension: serialized.fileExtension,
    //             variables: serialized.variables,
    //             driveFileId: serialized.driveFileId,
    //             storageFileUrl: serialized.storageFileUrl,
    //             inputMethod: serialized.inputMethod,
    //         },
    //     })
    // } catch (error: any) {
    //     console.error('Error getting template:', error)
    //     if (error instanceof z.ZodError) {
    //         return NextResponse.json(
    //             {
    //                 message: 'Invalid template ID',
    //             },
    //             { status: 400 },
    //         )
    //     }
    //     let status: number
    //     if (error instanceof AuthenticationError) {
    //         status = 401
    //     } else if (error instanceof NotFoundError) {
    //         status = 404
    //     } else if (error instanceof ForbiddenError) {
    //         status = 403
    //     } else {
    //         status = 500
    //     }
    //     return NextResponse.json(
    //         {
    //             message: error.message || 'An internal error occurred',
    //         },
    //         { status },
    //     )
    // }
}
