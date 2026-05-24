import { AuthenticationError } from '.'

export class SessionExpiredError extends AuthenticationError {
    constructor(detail?: string) {
        super({
            type: 'session-expired',
            title: 'Your session has expired',
            detail,
        })
    }
}
