export class FileUrlNotFoundError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'FileUrlNotFoundError'
    }
}
