import { ValidationError } from '.'

export class UnexistentDataSourceDriveFileIdError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'unexistent-data-source-drive-file-id',
            title: 'Data source Drive file does not exist',
            detail,
        })
    }
}
