import { ValidationError } from '.'

export class InvalidRecipientEmailError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'invalid-recipient-email',
            title: 'Recipient email is invalid',
            detail,
        })
    }
}
