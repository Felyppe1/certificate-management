import { ForbiddenError } from '.'

export class GoogleAccountEmailMismatchError extends ForbiddenError {
    constructor(detail?: string) {
        super({
            type: 'google-account-email-mismatch',
            title: 'Google account email does not match',
            detail,
        })
    }
}
