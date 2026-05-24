import { ValidationError } from '.'

export class NoDataSourceRowsError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'no-data-source-rows',
            title: 'Data source has no rows',
            detail,
        })
    }
}
