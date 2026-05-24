import { ValidationError } from '.'

export class InvalidRowDataError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'invalid-row-data',
            title: 'Row data is invalid',
            detail,
        })
    }
}
