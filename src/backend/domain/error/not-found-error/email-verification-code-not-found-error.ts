import { NotFoundError } from '.'

export class EmailVerificationCodeNotFoundError extends NotFoundError {
    constructor(detail?: string) {
        super({
            type: 'email-verification-code-not-found',
            title: 'Email verification code not found',
            detail,
        })
    }
}
