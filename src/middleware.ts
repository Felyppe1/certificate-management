import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

async function verifySession(token: string) {
    const response = await fetch(
        process.env.NEXT_PUBLIC_BASE_URL + '/api/auth/sessions',
        {
            method: 'GET',
            headers: {
                Cookie: `session_token=${token}`,
            },
        },
    )

    if (!response.ok) {
        return null
    }

    const session = await response.json()

    return session
}

export async function middleware(request: NextRequest) {
    console.log('middleware triggered by request to:', request.nextUrl.pathname)

    const response = NextResponse.next()

    if (request.nextUrl.pathname.startsWith('/api')) {
        return response
    }

    const cookie = await cookies()

    const sessionToken = cookie.get('session_token')?.value

    if (['/entrar', '/cadastrar-se'].includes(request.nextUrl.pathname)) {
        if (sessionToken) {
            return NextResponse.redirect(new URL('/', request.url))
        }

        return response
    }

    if (!sessionToken) {
        return NextResponse.redirect(new URL('/entrar', request.url))
    }

    const session = await verifySession(sessionToken)

    if (!session) {
        cookie.delete('session_token')

        return NextResponse.redirect(new URL('/entrar', request.url))
    }

    return response
}

export const config = {
    matcher: [
        '/',
        '/api/:path*',
        '/entrar/:path*',
        '/cadastrar-se/:path*',
        '/certificados/:path*',
    ],
}
