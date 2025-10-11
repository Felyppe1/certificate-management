'use server'

import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { Readable } from 'stream'
import { cookies } from 'next/headers'
import { PrismaExternalUserAccountsRepository } from '@/backend/infrastructure/repository/prisma/prisma-external-user-accounts-repository'
import { redirect } from 'next/navigation'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { MIME_TYPES } from '@/types'

interface UploadTemplateActionOutput {
    id?: string
    success: boolean
    message?: string
}

export async function uploadTemplateAction(
    _: unknown,
    formData: FormData,
): Promise<UploadTemplateActionOutput> {
    // TODO: talvez não precise revalidar a sessão, teoricamente, se ele entrou na página, a sessão dele é válida
    const cookie = await cookies()

    const userSession = cookie.get('session_token')?.value

    if (!userSession) {
        redirect(`/entrar`)
    }

    const file = formData.get('file') as File

    if (!file) {
        return {
            success: false,
            message: 'Nenhum arquivo enviado',
        }
    }

    // console.log(file)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // console.log(buffer)
    const oAuthClient = new OAuth2Client({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectUri:
            process.env.NEXT_PUBLIC_BASE_URL! + '/api/auth/google/callback',
    })

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

    // console.log(externalAccount)

    let mimeType: string
    // TODO: melhorar segurança
    if (file.name.endsWith('.docx')) {
        mimeType = MIME_TYPES.GOOGLE_DOCS // Google Docs
    } else if (file.name.endsWith('.pptx')) {
        mimeType = MIME_TYPES.GOOGLE_SLIDES // Google Slides
    } else {
        throw new Error('Formato não suportado (somente .docx ou .pptx)')
    }

    let uploaded

    try {
        oAuthClient.setCredentials({
            access_token: externalAccount.accessToken,
            refresh_token: externalAccount.refreshToken,
        })

        const drive = google.drive({ version: 'v3', auth: oAuthClient })

        const stream = new Readable()
        stream.push(buffer)
        stream.push(null)

        // TODO: verificar se o token já expirou pra pedir outro
        uploaded = await drive.files.create({
            requestBody: {
                name: file.name.replace('/\.(docx|pptx)$/i', ''),
                mimeType,
            },
            media: {
                mimeType: file.type, // ex: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
                body: stream,
            },
            fields: 'id',
        })
    } catch (error: any) {
        globalThis.logger?.emit({
            severityText: 'ERROR',
            body: 'Error adding template by URL',
            attributes: {
                err: error,
            },
        })

        // TODO: e se o refresh token tiver expirado?
        const { credentials } = await oAuthClient.refreshAccessToken()

        externalAccount.accessToken = credentials.access_token!
        await externalUserAccountsRepository.update(externalAccount)

        oAuthClient.setCredentials({
            access_token: credentials.access_token,
            refresh_token: externalAccount.refreshToken,
        })

        const drive = google.drive({ version: 'v3', auth: oAuthClient })

        const stream = new Readable()
        stream.push(buffer)
        stream.push(null)

        uploaded = await drive.files.create({
            requestBody: {
                name: file.name.replace('/\.(docx|pptx)$/i', ''),
                mimeType,
            },
            media: {
                mimeType: file.type, // ex: "application/vnd.openxmlformats-officedocument.presentationml.presentation"
                body: stream,
            },
            fields: 'id',
        })
    }

    const fileId = uploaded.data.id!
    let variables: string[] = []

    if (mimeType === MIME_TYPES.GOOGLE_DOCS) {
        variables = await extractFromDocs(oAuthClient, fileId)
    } else {
        variables = await extractFromSlides(oAuthClient, fileId)
    }

    console.log(variables)

    // TODO: save template
    // TODO: revalidate fetch

    return {
        id: fileId,
        success: true,
    }
}

async function extractFromDocs(auth: OAuth2Client, fileId: string) {
    const docs = google.docs({ version: 'v1', auth })
    const drive = google.drive({ version: 'v3', auth })

    const doc = await docs.documents.get({ documentId: fileId })

    const content = JSON.stringify(doc.data)
    const matches = content.match(/{{\s*[\w.-]+\s*}}/g) || []
    const uniqueMatches = Array.from(new Set(matches)) // remove duplicados

    // 🗑️ deletar o arquivo antes de retornar
    await drive.files.delete({ fileId })

    return uniqueMatches
}

async function extractFromSlides(auth: OAuth2Client, fileId: string) {
    const slides = google.slides({ version: 'v1', auth })
    const drive = google.drive({ version: 'v3', auth })

    const pres = await slides.presentations.get({ presentationId: fileId })

    // Percorre os textos de cada slide
    const texts: string[] = []
    for (const slide of pres.data.slides || []) {
        for (const el of slide.pageElements || []) {
            const shape = el.shape
            if (shape?.text?.textElements) {
                for (const t of shape.text.textElements) {
                    if (t.textRun?.content) {
                        texts.push(t.textRun.content)
                    }
                }
            }
        }
    }

    const content = texts.join(' ')
    const matches = content.match(/{{\s*[\w.-]+\s*}}/g) || []
    const uniqueMatches = Array.from(new Set(matches))

    await drive.files.delete({ fileId })

    return uniqueMatches
}
