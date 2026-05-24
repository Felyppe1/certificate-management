import { ServiceUnavailableError } from '.'

export class GenaiApiUnavailableError extends ServiceUnavailableError {
    constructor(detail?: string) {
        super({
            type: 'genai-api-unavailable',
            title: 'GenAI API is unavailable',
            detail,
        })
    }
}
