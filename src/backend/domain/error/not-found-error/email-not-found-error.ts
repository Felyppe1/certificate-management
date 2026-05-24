import { NotFoundError } from '.'

export class EmailNotFoundError extends NotFoundError {
    constructor(detail?: string) {
        super({ type: 'email-not-found', title: 'Email not found', detail })
    }
}
