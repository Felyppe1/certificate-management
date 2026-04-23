import { SESSION_COOKIE_NAME } from '@/app/api/_utils/constants'

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = [
    '/entrar',
    '/cadastrar-se',
    '/politicas-de-privacidade',
    '/termos-de-servico',
    '/verify-email',
]

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    console.log('middleware triggered by request to:', pathname)

    const isServerAction = request.headers.has('next-action')
    if (isServerAction) {
        // Let it go. The action will handle the error and the React Query will receive the response.
        return NextResponse.next()
    }

    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value

    const isPublicRoute = publicRoutes.includes(pathname)

    if (sessionToken) {
        if (pathname === '/entrar' || pathname === '/cadastrar-se') {
            return NextResponse.redirect(new URL('/', request.url))
        }

        return NextResponse.next()
    }

    // protection against infinite loop
    if (isPublicRoute) {
        const response = NextResponse.next()
        response.cookies.delete(SESSION_COOKIE_NAME)
        return response
    }

    return NextResponse.redirect(new URL('/entrar', request.url))
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
