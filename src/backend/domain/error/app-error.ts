interface Error {
    detail: string
    pointer: string
}

export class AppError<T> {
    title: string
    type: T
    detail?: string
    errors?: Error[]

    constructor(title: string, type: T, detail?: string, errors?: Error[]) {
        this.title = title
        this.type = type
        this.detail = detail
        this.errors = errors
    }
}
