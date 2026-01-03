import { AppError } from './app-error'

export enum FORBIDDEN_ERROR_TYPE {
    NOT_CERTIFICATE_OWNER = 'not-certificate-owner',
    GOOGLE_ACCOUNT_NOT_FOUND = 'google-account-not-found',
    GOOGLE_SESSION_EXPIRED = 'google-session-expired',
}

export class ForbiddenError extends AppError<FORBIDDEN_ERROR_TYPE> {
    constructor(type: FORBIDDEN_ERROR_TYPE, detail?: string) {
        const title = 'Forbidden action'

        super(title, type, detail)
    }
}
