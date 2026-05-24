import { NotFoundError } from '.'

export class ExternalAccountNotFoundError extends NotFoundError {
    constructor(detail?: string) {
        super({
            type: 'external-account-not-found',
            title: 'External account not found',
            detail,
        })
    }
}
