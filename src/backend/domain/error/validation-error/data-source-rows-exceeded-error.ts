import { ValidationError } from '.'

export class DataSourceRowsExceededError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'data-source-rows-exceeded',
            title: 'Data source rows limit exceeded',
            detail,
        })
    }
}
