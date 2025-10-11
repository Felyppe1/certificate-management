import { AppError } from './app-error'

export type UnauthorizedErrorType =
    | 'missing-session'
    | 'session-not-found'
    | 'external-account-not-found'
    | 'google-token-refresh-failed'
    | 'insufficient-external-account-scopes'
    | 'incorrect-credentials'

export class UnauthorizedError extends AppError<UnauthorizedErrorType> {
    constructor(type: UnauthorizedErrorType, detail?: string) {
        const title = 'You are not authenticated'

        super(title, type, detail)
    }
}
