import { AppError } from '../app-error'

export abstract class ForbiddenError extends AppError {
    constructor(input: { type: string; title: string; detail?: string }) {
        super({ ...input, status: 403 })
    }
}
