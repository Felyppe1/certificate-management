import { ForbiddenError } from '.'

export class GoogleSessionExpiredError extends ForbiddenError {
    constructor(detail?: string) {
        super({
            type: 'google-session-expired',
            title: 'Google session has expired',
            detail,
        })
    }
}
