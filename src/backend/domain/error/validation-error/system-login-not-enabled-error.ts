import { ValidationError } from '.'

export class SystemLoginNotEnabledError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'system-login-not-enabled',
            title: 'System login is not enabled',
            detail,
        })
    }
}
