import { ZodType } from 'zod'

export type FormattedError = {
    detail: string
    pointer: string
}

export type ValidationResult<T> =
    | { success: true; data: T }
    | { success: false; errors: FormattedError[] }

/**
 * Generic utilitary function for validating data with a Zod Schema
 * @param schema The Zod schema to be used in validation
 * @param data The data to be validated
 * @returns An object indicating success (with the data) or failure (with the formatted errors)
 */
export function validateData<T>(
    schema: ZodType<T>,
    data: unknown,
): ValidationResult<T> {
    const result = schema.safeParse(data)

    if (result.success) {
        return {
            success: true,
            data: result.data,
        }
    }

    return {
        success: false,
        errors: result.error.issues.map(issue => ({
            detail: issue.message,
            pointer: issue.path.join('.'),
        })),
    }
}
