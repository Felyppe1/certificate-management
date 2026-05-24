import { ValidationError } from '.'

export class DataSourceInvalidInputMethodError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'data-source-invalid-input-method',
            title: 'Data source has an invalid input method',
            detail,
        })
    }
}
