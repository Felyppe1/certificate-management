export class UnauthorizedError extends Error {
    title = 'You are not authenticated'

    constructor(detail?: string) {
        super(detail)
        this.name = 'UnauthorizedError'
    }
}
