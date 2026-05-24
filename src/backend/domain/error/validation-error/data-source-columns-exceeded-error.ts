import { ValidationError } from '.'

export class DataSourceColumnsExceededError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'data-source-columns-exceeded',
            title: 'Data source columns limit exceeded',
            detail,
        })
    }
}
