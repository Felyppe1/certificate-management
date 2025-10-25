import { AppError } from './app-error'

export enum FORBIDDEN_ERROR_TYPE {
    NOT_CERTIFICATE_OWNER = 'not-certificate-owner',
}

export class ForbiddenError extends AppError<FORBIDDEN_ERROR_TYPE> {
    constructor(type: FORBIDDEN_ERROR_TYPE, detail?: string) {
        const title = 'Forbidden action'

        super(title, type, detail)
    }
}
