import { NotFoundError } from '.'

export class DataSourceRowNotFoundError extends NotFoundError {
    constructor(detail?: string) {
        super({
            type: 'data-source-row-not-found',
            title: 'Data source row not found',
            detail,
        })
    }
}
