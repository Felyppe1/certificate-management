import { ValidationError } from '.'

export class FileUrlInvalidError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'file-url-invalid',
            title: 'File URL is invalid',
            detail,
        })
    }
}
