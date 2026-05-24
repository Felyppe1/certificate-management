import { ValidationError } from '.'

export class DataSourceRowsNotReadyError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'data-source-rows-not-ready',
            title: 'Data source rows are not ready',
            detail,
        })
    }
}
