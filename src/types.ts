export interface ActionResponse<T extends Record<string, any>> {
    success: boolean
    message?: string
    errors?: {
        [K in keyof T]?: string[]
    }
    inputs?: Partial<T>
}

export enum MIME_TYPES {
    PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    GOOGLE_SLIDES = 'application/vnd.google-apps.presentation',
    GOOGLE_DOCS = 'application/vnd.google-apps.document',
    DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}
