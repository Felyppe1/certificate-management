import { AppError } from '../app-error'

export abstract class AuthenticationError extends AppError {
    constructor(input: { type: string; title: string; detail?: string }) {
        super({ ...input, status: 401 })
    }
}
