import { ValidationError } from '.'

export class UnsupportedDataSourceMimetypeError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'unsupported-data-source-mimetype',
            title: 'Unsupported data source mimetype',
            detail,
        })
    }
}
