import { AuthenticationError } from '.'

export class MissingSessionError extends AuthenticationError {
    constructor(detail?: string) {
        super({
            type: 'missing-session',
            title: 'You are not authenticated',
            detail,
        })
    }
}
