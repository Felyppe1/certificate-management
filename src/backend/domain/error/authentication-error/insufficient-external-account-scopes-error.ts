import { AuthenticationError } from '.'

export class InsufficientExternalAccountScopesError extends AuthenticationError {
    constructor(detail?: string) {
        super({
            type: 'insufficient-external-account-scopes',
            title: 'Insufficient external account scopes',
            detail,
        })
    }
}
