import { ConflictError } from '.'

export class EmailAlreadyVerifiedError extends ConflictError {
    constructor(detail?: string) {
        super({
            type: 'email-already-verified',
            title: 'Email is already verified',
            detail,
        })
    }
}
