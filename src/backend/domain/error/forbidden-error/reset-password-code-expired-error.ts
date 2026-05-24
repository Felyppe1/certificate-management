import { ForbiddenError } from '.'

export class ResetPasswordCodeExpiredError extends ForbiddenError {
    constructor(detail?: string) {
        super({
            type: 'reset-password-code-expired',
            title: 'Reset password code has expired',
            detail,
        })
    }
}
