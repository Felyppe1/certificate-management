import { AuthenticationError } from '.'

export class InvalidServiceTokenError extends AuthenticationError {
    constructor(detail?: string) {
        super({
            type: 'invalid-service-token',
            title: 'Invalid service token',
            detail,
        })
    }
}
