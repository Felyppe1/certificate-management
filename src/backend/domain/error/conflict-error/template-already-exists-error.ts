import { ConflictError } from '.'

export class TemplateAlreadyExistsError extends ConflictError {
    constructor(detail?: string) {
        super({
            type: 'template-already-exists',
            title: 'Template already exists',
            detail,
        })
    }
}
