import { ValidationError } from '.'

export class CurrentPasswordIncorrectError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'current-password-incorrect',
            title: 'Current password is incorrect',
            detail,
        })
    }
}
