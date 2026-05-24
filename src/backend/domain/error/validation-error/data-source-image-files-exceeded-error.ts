import { ValidationError } from '.'

export class DataSourceImageFilesExceededError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'data-source-image-files-exceeded',
            title: 'Data source image files limit exceeded',
            detail,
        })
    }
}
