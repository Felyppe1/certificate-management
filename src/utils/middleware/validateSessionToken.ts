import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function validateSessionToken(req?: NextRequest) {
    const cookieStore = await cookies()

    const cookieToken = cookieStore.get('session_token')?.value

    // TODO: it seems like it is not passing session token through Authorization
    const authHeader = req?.headers.get('Authorization')

    const bearerToken = authHeader?.startsWith('Bearer ')
        ? authHeader.replace('Bearer ', '')
        : null

    const sessionToken = bearerToken || cookieToken || null

    if (!sessionToken) {
        throw new AuthenticationError('missing-session')
    }

    const sessionsRepository = new PrismaSessionsRepository(prisma)

    const session = await sessionsRepository.getById(sessionToken)

    if (!session) {
        throw new AuthenticationError('session-not-found')
    }

    return session
}
