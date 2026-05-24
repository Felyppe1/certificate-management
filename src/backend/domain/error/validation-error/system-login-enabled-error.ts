import { ValidationError } from '.'

export class SystemLoginEnabledError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'system-login-enabled',
            title: 'System login is already enabled',
            detail,
        })
    }
}
