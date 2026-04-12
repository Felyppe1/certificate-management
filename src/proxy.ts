import { SESSION_COOKIE_NAME } from '@/app/api/_utils/constants'

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = ['/entrar', '/cadastrar-se']

export function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    console.log('middleware triggered by request to:', pathname)

    const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
    console.log('Session token from cookie:', sessionToken)

    const isPublicRoute = publicRoutes.includes(pathname)

    if (sessionToken) {
        if (isPublicRoute) {
            return NextResponse.redirect(new URL('/', request.url))
        }

        return NextResponse.next()
    }

    const isServerAction = request.headers.has('next-action')
    if (isServerAction) {
        // Let it go. The action will handle the error and the React Query will receive the response.
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
