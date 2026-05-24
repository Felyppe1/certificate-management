import { ValidationError } from '.'

export class InsufficientCreditsError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'insufficient-credits',
            title: 'Insufficient credits',
            detail,
        })
    }
}
