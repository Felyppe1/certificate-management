import { AuthenticationError } from '.'

export class SessionNotFoundError extends AuthenticationError {
    constructor(detail?: string) {
        super({
            type: 'session-not-found',
            title: 'You are not authenticated',
            detail,
        })
    }
}
