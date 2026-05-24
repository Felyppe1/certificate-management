import { ConflictError } from '.'

export class UserAlreadyExistsError extends ConflictError {
    constructor(detail?: string) {
        super({
            type: 'user-already-exists',
            title: 'User already exists',
            detail,
        })
    }
}
