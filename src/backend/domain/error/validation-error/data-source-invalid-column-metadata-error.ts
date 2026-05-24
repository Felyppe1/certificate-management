import { ValidationError } from '.'

export class DataSourceInvalidColumnMetadataError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'data-source-invalid-column-metadata',
            title: 'Data source has invalid column metadata',
            detail,
        })
    }
}
