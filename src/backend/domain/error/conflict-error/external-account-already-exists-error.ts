import { ConflictError } from '.'

export class ExternalAccountAlreadyExistsError extends ConflictError {
    constructor(detail?: string) {
        super({
            type: 'external-account-already-exists',
            title: 'External account already exists',
            detail,
        })
    }
}
