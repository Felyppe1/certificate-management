import { ValidationError } from '.'

export class UnexistentTemplateDriveFileIdError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'unexistent-template-drive-file-id',
            title: 'Template Drive file does not exist',
            detail,
        })
    }
}
