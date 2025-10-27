import { AuthenticationError } from '@/backend/domain/error/authentication-error'
import { ConflictError } from '@/backend/domain/error/conflict-error'
import { NotFoundError } from '@/backend/domain/error/not-found-error'
import { ValidationError } from '@/backend/domain/error/validation-error'
import { NextResponse } from 'next/server'
import z from 'zod'

export async function handleError(error: any) {
    // TODO: send to observability service
    console.error(error)

    if (error instanceof z.ZodError) {
        return NextResponse.json(
            {
                type: 'validation-error',
                title: 'Your request is not valid',
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
    if (error instanceof AuthenticationError) {
        return NextResponse.json(
            { type: error.type, title: error.title },
            { status: 401 },
        )
    }
    if (error instanceof NotFoundError) {
        return NextResponse.json(
            { type: error.type, title: error.title, detail: error.detail },
            { status: 404 },
        )
    }
    if (error instanceof ConflictError) {
        return NextResponse.json(
            {
                type: error.type,
                title: error.title,
                detail: error.detail,
                pointers: error.pointers,
            },
            { status: 409 },
        )
    }
    if (error instanceof ValidationError) {
        return NextResponse.json(
            { type: error.type, title: error.title, detail: error.detail },
            { status: 422 },
        )
    }

    return NextResponse.json(
        {
            type: 'about:blank',
            title: 'An internal error occurred',
            detail: error.message,
        },
        { status: 500 },
    )
}
