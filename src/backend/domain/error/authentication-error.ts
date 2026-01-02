import { AppError } from './app-error'

export type AuthenticationErrorType =
    | 'missing-session'
    | 'session-not-found'
    | 'user-not-found'
    | 'external-account-not-found'
    | 'google-token-refresh-failed'
    | 'insufficient-external-account-scopes'
    | 'incorrect-credentials'
    | 'invalid-service-account'
    | 'invalid-service-token'
    | 'missing-token'
    | 'invalid-token'

export class AuthenticationError extends AppError<AuthenticationErrorType> {
    constructor(type: AuthenticationErrorType, detail?: string) {
        const title = 'You are not authenticated'

        super(title, type, detail)
    }
}
