export abstract class AppError extends Error {
    type: string
    title: string
    status: number
    detail?: string
    extensions?: Record<string, unknown>

    constructor(input: {
        type: string
        title: string
        status: number
        detail?: string
        extensions?: Record<string, unknown>
    }) {
        super(input.title)
        this.name = new.target.name
        this.type = input.type
        this.title = input.title
        this.status = input.status
        this.detail = input.detail
        this.extensions = input.extensions
    }
}
