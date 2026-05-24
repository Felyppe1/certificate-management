import { ValidationError } from '.'

export class TemplateFileSizeTooLargeError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'template-file-size-too-large',
            title: 'Template file size is too large',
            detail,
        })
    }
}
