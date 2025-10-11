export class AppError<T> {
    title: string
    type: T
    detail?: string

    constructor(title: string, type: T, detail?: string) {
        this.title = title
        this.type = type
        this.detail = detail
    }
}
