import { ForbiddenError } from '.'

export class NotAdminError extends ForbiddenError {
    constructor(detail?: string) {
        super({ type: 'not-admin', title: 'You are not an admin', detail })
    }
}
