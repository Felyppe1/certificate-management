import { AuthenticationError } from '.'

export class InvalidTokenError extends AuthenticationError {
    constructor(detail?: string) {
        super({
            type: 'invalid-token',
            title: 'Invalid authentication token',
            detail,
        })
    }
}
