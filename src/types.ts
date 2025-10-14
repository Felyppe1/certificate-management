export interface ActionResponse<T extends Record<string, any>> {
    success: boolean
    message?: string
    errors?: {
        [K in keyof T]?: string[]
    }
    inputs?: Partial<T>
}
