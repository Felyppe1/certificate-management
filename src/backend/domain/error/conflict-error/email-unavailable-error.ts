import { ConflictError } from '.'

export class EmailUnavailableError extends ConflictError {
    constructor(detail?: string) {
        super({
            type: 'email-unavailable',
            title: 'Email is unavailable',
            detail,
        })
    }
}
