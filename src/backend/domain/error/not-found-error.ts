import { AppError } from './app-error'

export enum NOT_FOUND_ERROR_TYPE {
    CERTIFICATE = 'certificate-not-found',
    TEMPLATE = 'template-not-found',
    DATA_SOURCE = 'data-source-not-found',
    DATA_SET = 'data-set-not-found',
    USER = 'user-not-found',
    DRIVE_FILE = 'drive-file-not-found',
}

export class NotFoundError extends AppError<NOT_FOUND_ERROR_TYPE> {
    constructor(type: NOT_FOUND_ERROR_TYPE, detail?: string) {
        const title = 'Resource not found'

        super(title, type, detail)
    }
}
