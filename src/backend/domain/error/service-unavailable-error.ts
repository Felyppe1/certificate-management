import { AppError } from './app-error'

export type SERVICE_UNAVAILABLE_ERROR_TYPE = 'genai-api-unavailable'

export class ServiceUnavailableError extends AppError<SERVICE_UNAVAILABLE_ERROR_TYPE> {
    public message?: string

    constructor(
        type: SERVICE_UNAVAILABLE_ERROR_TYPE,
        detail?: string,
        message?: string,
    ) {
        const title = 'The required service is currently unavailable'

        super(title, type, detail)
        this.message = message
    }
}
