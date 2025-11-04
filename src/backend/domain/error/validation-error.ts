import { AppError } from './app-error'

export enum VALIDATION_ERROR_TYPE {
    UNSUPPORTED_DATA_SOURCE_MIMETYPE = 'unsupported-data-source-mimetype',
    UNSUPPORTED_TEMPLATE_MIMETYPE = 'unsupported-template-mimetype',
    FILE_URL_INVALID = 'file-url-invalid',
    UNEXISTENT_DATA_SOURCE_DRIVE_FILE_ID = 'unexistent-data-source-drive-file-id',
    UNEXISTENT_TEMPLATE_DRIVE_FILE_ID = 'unexistent-template-drive-file-id',
    MIMETYPE_MISSING = 'mimetype-missing',
    NO_DATA_SET_ROWS = 'no-data-set-rows',
}

export class ValidationError extends AppError<VALIDATION_ERROR_TYPE> {
    constructor(type: VALIDATION_ERROR_TYPE, detail?: string) {
        const title =
            'The server could not process the request because it would break a business rule'

        super(title, type, detail)
    }
}
