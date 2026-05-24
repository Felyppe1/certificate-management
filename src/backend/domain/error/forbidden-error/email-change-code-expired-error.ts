import { ForbiddenError } from '.'

export class EmailChangeCodeExpiredError extends ForbiddenError {
    constructor(detail?: string) {
        super({
            type: 'email-change-code-expired',
            title: 'Email change code has expired',
            detail,
        })
    }
}
