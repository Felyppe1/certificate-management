import { ForbiddenError } from '.'

export class EmailNotVerifiedError extends ForbiddenError {
    constructor(detail?: string) {
        super({
            type: 'email-not-verified',
            title: 'Email has not been verified',
            detail,
        })
    }
}
