import { NotFoundError } from '.'

export class UserNotFoundError extends NotFoundError {
    constructor(detail?: string) {
        super({ type: 'user-not-found', title: 'User not found', detail })
    }
}
