import { NotFoundError } from '.'

export class DataSetNotFoundError extends NotFoundError {
    constructor(detail?: string) {
        super({
            type: 'data-set-not-found',
            title: 'Data set not found',
            detail,
        })
    }
}
