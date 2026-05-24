import { ValidationError } from '.'

export class DataSourceRowsNotFoundError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'data-source-rows-not-found',
            title: 'Data source rows not found',
            detail,
        })
    }
}
