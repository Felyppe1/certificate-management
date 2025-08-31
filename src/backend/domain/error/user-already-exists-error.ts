export class UserAlreadyExistsError extends Error {
    constructor(detail?: string) {
        super(detail)
        this.name = 'UserAlreadyExistsError'
    }
}
