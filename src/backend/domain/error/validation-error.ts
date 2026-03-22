import { AppError } from './app-error'

export enum VALIDATION_ERROR_TYPE {
    UNSUPPORTED_DATA_SOURCE_MIMETYPE = 'unsupported-data-source-mimetype',
    UNSUPPORTED_TEMPLATE_MIMETYPE = 'unsupported-template-mimetype',
    FILE_URL_INVALID = 'file-url-invalid',
    UNEXISTENT_DATA_SOURCE_DRIVE_FILE_ID = 'unexistent-data-source-drive-file-id',
    UNEXISTENT_TEMPLATE_DRIVE_FILE_ID = 'unexistent-template-drive-file-id',
    MIMETYPE_MISSING = 'mimetype-missing',
    NO_DATA_SOURCE_ROWS = 'no-data-source-rows',
    NO_FAILED_DATA_SOURCE_ROWS = 'no-failed-data-source-rows',
    GENERATION_ALREADY_IN_PROGRESS = 'generation-already-in-progress',
    UNEXISTENT_DATA_SOURCE_COLUMN = 'unexistent-data-source-column',
    INVALID_RECIPIENT_EMAIL = 'invalid-recipient-email',
    CERTIFICATES_NOT_GENERATED = 'certificates-not-generated',
    CERTIFICATE_NOT_GENERATED = 'certificate-not-generated',
    TEMPLATE_VARIABLES_PARSING_ERROR = 'template-variables-parsing-error',
    FILE_BYTES_MISSING = 'file-bytes-missing',
    INSUFFICIENT_CREDITS = 'insufficient-credits',
    DATA_SOURCE_ROWS_EXCEEDED = 'data-source-rows-exceeded',
    DATA_SOURCE_ROWS_NOT_READY = 'data-source-rows-not-ready',
    DATA_SOURCE_FILE_SIZE_TOO_LARGE = 'data-source-file-size-too-large',
    DATA_SOURCE_ROWS_NOT_FOUND = 'data-source-rows-not-found',
    TEMPLATE_FILE_SIZE_TOO_LARGE = 'template-file-size-too-large',
    DATA_SOURCE_COLUMNS_NOT_FOUND = 'data-source-columns-not-found',
    DATA_SOURCE_INVALID_COLUMN_TYPES = 'data-source-invalid-column-types',
    DATA_SOURCE_INVALID_COLUMN_METADATA = 'data-source-invalid-column-metadata',
    DATA_SOURCE_COLUMN_TYPE_CHANGE_NOT_ALLOWED = 'data-source-column-type-change-not-allowed',
}

export class ValidationError extends AppError<VALIDATION_ERROR_TYPE> {
    constructor(type: VALIDATION_ERROR_TYPE, detail?: string) {
        const title =
            'The server could not process the request because it would break a business rule'

        super(title, type, detail)
    }
}
