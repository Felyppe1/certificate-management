import { ValidationError } from '.'

export class FileBytesMissingError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'file-bytes-missing',
            title: 'File bytes are missing',
            detail,
        })
    }
}
