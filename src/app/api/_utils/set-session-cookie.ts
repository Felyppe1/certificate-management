import { cookies } from 'next/headers'
import { SESSION_EXPIRY_DAYS } from '@/backend/domain/session'
import { SESSION_COOKIE_NAME } from './constants'

export async function setSessionCookie(token: string): Promise<void> {
    const cookie = await cookies()
    cookie.set(SESSION_COOKIE_NAME, token, {
        httpOnly: true,
        path: '/',
        maxAge: SESSION_EXPIRY_DAYS * 24 * 60 * 60,
        // secure: true,
        // sameSite: 'strict',
    })
}
