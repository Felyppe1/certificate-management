import { ValidationError } from '.'

export class DataSourceInvalidColumnTypesError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'data-source-invalid-column-types',
            title: 'Data source has invalid column types',
            detail,
        })
    }
}
