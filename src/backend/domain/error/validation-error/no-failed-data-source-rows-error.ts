import { ValidationError } from '.'

export class NoFailedDataSourceRowsError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'no-failed-data-source-rows',
            title: 'Data source has no failed rows',
            detail,
        })
    }
}
