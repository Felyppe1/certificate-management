import { ValidationError } from '.'

export class DataSourceNotImageError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'data-source-not-image',
            title: 'Data source is not an image',
            detail,
        })
    }
}
