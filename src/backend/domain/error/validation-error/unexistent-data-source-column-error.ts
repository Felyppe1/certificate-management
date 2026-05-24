import { ValidationError } from '.'

export class UnexistentDataSourceColumnError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'unexistent-data-source-column',
            title: 'Data source column does not exist',
            detail,
        })
    }
}
