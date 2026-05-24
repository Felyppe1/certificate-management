import { ValidationError } from '.'

export class UnsupportedTemplateMimetypeError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'unsupported-template-mimetype',
            title: 'Unsupported template mimetype',
            detail,
        })
    }
}
