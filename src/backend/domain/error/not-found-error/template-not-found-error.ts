import { NotFoundError } from '.'

export class TemplateNotFoundError extends NotFoundError {
    constructor(detail?: string) {
        super({
            type: 'template-not-found',
            title: 'Template not found',
            detail,
        })
    }
}
