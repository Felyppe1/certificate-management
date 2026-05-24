import { ValidationError } from '.'

export class DataSourceAllFilesNotImagesError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'data-source-all-files-not-images',
            title: 'All data source files must be images',
            detail,
        })
    }
}
