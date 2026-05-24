import { AppError } from '../app-error'

export abstract class ConflictError extends AppError {
    constructor(input: { type: string; title: string; detail?: string }) {
        super({ ...input, status: 409 })
    }
}
