import { NextResponse } from 'next/server'
import { RedisSessionsRepository } from '@/backend/infrastructure/repository/redis/redis-sessions-repository'
import { cookies } from 'next/headers'
import { prisma } from '@/backend/infrastructure/repository/prisma'

export async function GET() {
    await new Promise(resolve => setTimeout(resolve, 1000))

    const cookie = await cookies()

    try {
        const sessionToken = cookie.get('session_token')?.value

        if (!sessionToken) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Sessão não encontrada',
                },
                { status: 401 },
            )
        }

        const sessionsRepository = new RedisSessionsRepository()

        const session = await sessionsRepository.getById(sessionToken)

        if (!session) {
            return NextResponse.json(
                {
                    success: false,
                    message: 'Sessão inválida',
                },
                { status: 401 },
            )
        }

        // Buscar templates do usuário
        const templates = await prisma.template.findMany({
            where: {
                user_id: session.userId,
            },
            include: {
                TemplateVariable: true,
            },
        })

        const templateList = templates.map(template => ({
            id: template.id,
            driveFileId: template.drive_file_id,
            storageFileUrl: template.storage_file_url,
            fileName: template.file_name,
            fileExtension: template.file_extension,
            inputMethod: template.input_method,
            variableCount: template.TemplateVariable.length,
            userId: template.user_id,
        }))

        return NextResponse.json({
            templates: templateList,
        })
    } catch (error) {
        console.error('Error listing templates:', error)
        return NextResponse.json(
            {
                success: false,
                message: 'Erro ao buscar templates',
            },
            { status: 500 },
        )
    }
}
