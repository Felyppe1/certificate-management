import { SESSION_COOKIE_NAME } from '@/app/api/_utils/constants'

import { MissingSessionError } from '@/backend/domain/error/authentication-error/missing-session-error'
import { SessionNotFoundError } from '@/backend/domain/error/authentication-error/session-not-found-error'
import { SessionExpiredError } from '@/backend/domain/error/authentication-error/session-expired-error'
import { prisma } from '@/backend/infrastructure/repository/prisma'
import { PrismaSessionsRepository } from '@/backend/infrastructure/repository/prisma/prisma-sessions-repository'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function validateSessionToken(req?: NextRequest) {
    const cookieStore = await cookies()

    const cookieToken = cookieStore.get(SESSION_COOKIE_NAME)?.value

    // TODO: it seems like it is not passing session token through Authorization
    const authHeader = req?.headers.get('Authorization')

    const bearerToken = authHeader?.startsWith('Bearer ')
        ? authHeader.replace('Bearer ', '')
        : null

    const sessionToken = bearerToken || cookieToken || null

    if (!sessionToken) {
        throw new MissingSessionError()
    }

    const sessionsRepository = new PrismaSessionsRepository(prisma)

    const session = await sessionsRepository.getById(sessionToken)

    if (!session) {
        throw new SessionNotFoundError()
    }

    if (session.isExpired()) {
        throw new SessionExpiredError()
    }

    return { userId: session.getUserId(), token: session.getToken() }
}
