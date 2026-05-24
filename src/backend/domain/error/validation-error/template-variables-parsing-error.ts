import { ValidationError } from '.'

export class TemplateVariablesParsingError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'template-variables-parsing-error',
            title: 'Failed to parse template variables',
            detail,
        })
    }
}
