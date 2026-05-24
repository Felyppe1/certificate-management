import { ForbiddenError } from '.'

export class GoogleAccountNotFoundError extends ForbiddenError {
    constructor(detail?: string) {
        super({
            type: 'google-account-not-found',
            title: 'Google account not found',
            detail,
        })
    }
}
