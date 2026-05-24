import { ValidationError } from '.'

export class DataSourceColumnTypeChangeNotAllowedError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'data-source-column-type-change-not-allowed',
            title: 'Data source column type change is not allowed',
            detail,
        })
    }
}
