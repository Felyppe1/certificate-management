import { ForbiddenError } from '.'

export class VerificationCodeInvalidError extends ForbiddenError {
    constructor(detail?: string) {
        super({
            type: 'verification-code-invalid',
            title: 'Verification code is invalid',
            detail,
        })
    }
}
