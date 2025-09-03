'use server'

import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { cookies } from 'next/headers'
import officeParser from 'officeparser'

export async function setFileUrlAction(_: unknown, formData: FormData) {
    const cookie = await cookies()

    const userSession = cookie.get('session_token')?.value

    if (!userSession) {
        return {
            success: false,
        }
    }

    const fileUrl = formData.get('file') as string

    if (!fileUrl) {
        return {
            success: false,
        }
    }

    const sessionsRepository = new PrismaSessionsRepository()
    const externalUserAccountsRepository =
        new PrismaExternalUserAccountsRepository()

    const session = await sessionsRepository.getById(userSession)
    if (!session) {
        throw new Error('Unauthorized')
    }

    const externalAccount = await externalUserAccountsRepository.getById(
        session.userId,
        'GOOGLE',
    )
    if (!externalAccount) {
        throw new Error('Unauthorized')
    }

    // TODO: para onde vai isso aqui?
    const match = fileUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)
    const fileId = match ? match[1] : null

    if (!fileId) {
        return {
            success: false,
            // message: "URL do arquivo inválida",
        }
    }

    // TODO: colocar em infrastructure

    const url = `https://docs.google.com/document/d/${fileId}/export?format=docx`

    const res = await fetch(url)

    if (!res.ok) {
        throw new Error('Erro ao baixar do Google Docs')
    }

    const buffer = Buffer.from(await res.arrayBuffer())

    const content = await officeParser.parseOfficeAsync(buffer)

    const matches = [...content.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)]
    const variables = matches.map(match => match[1])
    const uniqueVariables = Array.from(new Set(variables))

    return {
        success: true,
    }
}
