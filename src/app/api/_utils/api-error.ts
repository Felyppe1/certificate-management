export class ApiError extends Error {
    statusCode: number
    body: {
        type: string
        title: string
        detail?: string
    }

    constructor(
        statusCode: number,
        body: { type: string; title: string; detail?: string },
    ) {
        super(body.title)
        this.name = 'ApiError'
        this.statusCode = statusCode
        this.body = body
    }
}
