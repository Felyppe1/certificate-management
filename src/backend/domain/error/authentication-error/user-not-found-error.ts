import { AuthenticationError } from '.'

export class UserNotFoundError extends AuthenticationError {
    constructor(detail?: string) {
        super({
            type: 'user-not-found',
            title: 'You are not authenticated',
            detail,
        })
    }
}
