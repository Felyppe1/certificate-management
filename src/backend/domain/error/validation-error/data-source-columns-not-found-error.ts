import { ValidationError } from '.'

export class DataSourceColumnsNotFoundError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'data-source-columns-not-found',
            title: 'Data source columns not found',
            detail,
        })
    }
}
