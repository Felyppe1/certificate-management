import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { PrismaSessionsRepository } from './backend/infrastructure/repository/prisma/prisma-sessions-repository'

export async function middleware(request: NextRequest) {
    console.log('middleware triggered by request to:', request.nextUrl.pathname)

    const response = NextResponse.next()

    if (request.nextUrl.pathname.startsWith('/api')) {
        return response
    }

    const cookie = response.cookies.get('session_token')
    
    if (['/entrar', '/cadastrar-se'].includes(request.nextUrl.pathname)) {
        if (cookie) {
            return NextResponse.redirect(new URL('/', request.url))
        }

        return response
    }

    if (!cookie) {
        return NextResponse.redirect(new URL('/entrar', request.url))
    }

    const session = await new PrismaSessionsRepository().getById(cookie.value)

    if (!session) {
        return NextResponse.redirect(new URL('/entrar', request.url))
    }

    return response
}

export const config = {
    matcher: ['/', "/api/:path*", "/entrar/:path*",]
}
