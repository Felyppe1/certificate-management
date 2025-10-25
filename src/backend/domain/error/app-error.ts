export class AppError<T> {
    title: string
    type: T
    detail?: string
    // attribute instance

    constructor(title: string, type: T, detail?: string) {
        this.title = title
        this.type = type
        this.detail = detail
    }
}
