import { AppError } from './app-error'

export enum CONFLICT_ERROR_TYPE {
    CERTIFICATE = 'certificate-already-exists',
    TEMPLATE = 'template-already-exists',
    USER = 'user-already-exists',
}

export class ConflictError extends AppError<CONFLICT_ERROR_TYPE> {
    pointers?: string[]

    constructor(
        type: CONFLICT_ERROR_TYPE,
        detail?: string,
        pointers?: string[],
    ) {
        const title = 'Resource conflict'

        super(title, type, detail)

        this.pointers = pointers
    }
}
