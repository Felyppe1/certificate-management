export class ValidationError extends Error {
    errors?: Error[]

    constructor(message: string, errors?: Error[]) {
        super(message)
        this.name = 'ValidationError'
        this.errors = errors
    }
}
