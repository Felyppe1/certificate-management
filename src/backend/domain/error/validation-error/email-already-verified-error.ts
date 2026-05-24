import { ValidationError } from '.'

export class EmailAlreadyVerifiedError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'email-already-verified',
            title: 'Email is already verified',
            detail,
        })
    }
}
