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

    let isSessionValid = false

    if (sessionToken) {
        const session = await verifySession(sessionToken)
        if (session) {
            isSessionValid = true
        } else {
            cookie.delete('session_token')
        }
    }

    if (!isSessionValid) {
        // Check if the request came from a Server Action
        const isServerAction = request.headers.has('next-action')

        if (isServerAction) {
            // If it's a Server Action, LET IT PASS.
            // The request will hit your Action, your `validateSessionToken()`

            // It will throw an error, fall into the Catch block, and return `{ success: false, errorType: '...' }`
            // which is exactly what your frontend (React Query) expects to receive.
            return response
        }

        // If it's NOT a Server Action (e.g., the user typed the URL or refreshed the page)
        // Redirect to the login page normally
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
