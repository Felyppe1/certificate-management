import { ValidationError } from '.'

export class DataSourceImageRefreshNotAllowedError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'data-source-image-refresh-not-allowed',
            title: 'Data source image refresh is not allowed',
            detail,
        })
    }
}
