import { SESSION_COOKIE_NAME } from '@/app/api/_utils/constants'
import { AppError } from '@/backend/domain/error/app-error'
import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { NextResponse } from 'next/server'
import z from 'zod'

export interface HandleErrorResponse {
    type: string
    title: string
    status: number
    detail?: string
    errors?: {
        detail: string
        pointer: string
    }[]
}

export async function handleError(error: any) {
    // TODO: send to observability service
    console.error(error)
    console.error('META', error.meta)

    if (error instanceof z.ZodError) {
        return NextResponse.json(
            {
                type: 'validation-error',
                title: 'Your request is not valid',
                status: 400,
                detail: 'The data provided is not valid',
                errors: error.issues.map(issue => {
                    return {
                        detail: issue.message,
                        pointer: issue.path.join('.'),
                    }
                }),
            },
            { status: 400 },
        )
    }

    if (!(error instanceof AppError)) {
        return NextResponse.json(
            {
                type: 'about:blank',
                title: 'Internal Server Error',
                status: 500,
            },
            { status: 500 },
        )
    }

    const body = {
        type: error.type,
        title: error.message,
        detail: error.detail,
        status: error.status,
        ...error.extensions,
    }

    if (error instanceof AuthenticationError) {
        const response = NextResponse.json(body, { status: error.status })
        response.cookies.delete({
            name: SESSION_COOKIE_NAME,
            path: '/',
            httpOnly: true,
        })
        return response
    }

    return NextResponse.json(body, { status: error.status })
}
