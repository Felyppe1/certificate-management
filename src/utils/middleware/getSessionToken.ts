import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function getSessionToken(req: NextRequest) {
    const cookieStore = await cookies()

    const cookieToken = cookieStore.get('session_token')?.value

    const authHeader = req.headers.get('Authorization')

    const bearerToken = authHeader?.startsWith('Bearer ')
        ? authHeader.replace('Bearer ', '')
        : null

    const sessionToken = bearerToken || cookieToken || null

    if (!sessionToken) {
        throw new AuthenticationError('missing-session')
    }

    return sessionToken
}
