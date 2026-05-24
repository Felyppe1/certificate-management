import { ValidationError } from '.'

export class DataSourceFileRequiredError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'data-source-file-required',
            title: 'Data source file is required',
            detail,
        })
    }
}
