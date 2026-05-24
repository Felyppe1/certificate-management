import { NotFoundError } from '.'

export class DriveFileNotFoundError extends NotFoundError {
    constructor(detail?: string) {
        super({
            type: 'drive-file-not-found',
            title: 'Drive file not found',
            detail,
        })
    }
}
