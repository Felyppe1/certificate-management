import { ValidationError } from '.'

export class DataSourceFileSizeTooLargeError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'data-source-file-size-too-large',
            title: 'Data source file size is too large',
            detail,
        })
    }
}
