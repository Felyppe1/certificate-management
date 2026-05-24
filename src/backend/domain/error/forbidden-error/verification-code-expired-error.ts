import { ForbiddenError } from '.'

export class VerificationCodeExpiredError extends ForbiddenError {
    constructor(detail?: string) {
        super({
            type: 'verification-code-expired',
            title: 'Verification code has expired',
            detail,
        })
    }
}
