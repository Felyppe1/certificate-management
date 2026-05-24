import { AuthenticationError } from '.'

export class MissingTokenError extends AuthenticationError {
    constructor(detail?: string) {
        super({
            type: 'missing-token',
            title: 'Authentication token is missing',
            detail,
        })
    }
}
