export class SessionNotFoundError extends Error {
    title = 'Session not found'

    constructor(detail?: string) {
        super(detail)
        this.name = 'SessionNotFoundError'
    }
}
