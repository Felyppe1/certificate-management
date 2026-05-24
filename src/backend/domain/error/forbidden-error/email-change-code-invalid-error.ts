import { ForbiddenError } from '.'

export class EmailChangeCodeInvalidError extends ForbiddenError {
    constructor(detail?: string) {
        super({
            type: 'email-change-code-invalid',
            title: 'Email change code is invalid',
            detail,
        })
    }
}
