export class ApiError extends Error {
    type: string
    title: string
    status: number
    detail?: string

    constructor(
        status: number,
        body: { type: string; title: string; detail?: string },
    ) {
        super(body.title)
        this.name = 'ApiError'
        this.type = body.type
        this.title = body.title
        this.status = status
        this.detail = body.detail
    }
}
