import { ValidationError } from '.'

export class LastLoginMethodError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'last-login-method',
            title: 'Cannot remove the last login method',
            detail,
        })
    }
}
