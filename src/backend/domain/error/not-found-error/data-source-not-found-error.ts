import { NotFoundError } from '.'

export class DataSourceNotFoundError extends NotFoundError {
    constructor(detail?: string) {
        super({
            type: 'data-source-not-found',
            title: 'Data source not found',
            detail,
        })
    }
}
