import { AuthenticationError } from '.'

export class IncorrectCredentialsError extends AuthenticationError {
    constructor(detail?: string) {
        super({
            type: 'incorrect-credentials',
            title: 'Incorrect credentials',
            detail,
        })
    }
}
