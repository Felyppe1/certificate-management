import { ValidationError } from '.'

export class MimetypeMissingError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'mimetype-missing',
            title: 'Mimetype is missing',
            detail,
        })
    }
}
