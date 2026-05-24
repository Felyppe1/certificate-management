import { ForbiddenError } from '.'

export class ResetPasswordCodeInvalidError extends ForbiddenError {
    constructor(detail?: string) {
        super({
            type: 'reset-password-code-invalid',
            title: 'Reset password code is invalid',
            detail,
        })
    }
}
