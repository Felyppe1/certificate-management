import { ValidationError } from '.'

export class NoGoogleAccountError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'no-google-account',
            title: 'No Google account linked',
            detail,
        })
    }
}
