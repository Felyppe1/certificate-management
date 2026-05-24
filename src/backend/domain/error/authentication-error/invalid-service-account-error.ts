import { AuthenticationError } from '.'

export class InvalidServiceAccountError extends AuthenticationError {
    constructor(detail?: string) {
        super({
            type: 'invalid-service-account',
            title: 'Invalid service account',
            detail,
        })
    }
}
