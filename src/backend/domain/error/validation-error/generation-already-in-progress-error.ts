import { ValidationError } from '.'

export class GenerationAlreadyInProgressError extends ValidationError {
    constructor(detail?: string) {
        super({
            type: 'generation-already-in-progress',
            title: 'Certificate generation is already in progress',
            detail,
        })
    }
}
