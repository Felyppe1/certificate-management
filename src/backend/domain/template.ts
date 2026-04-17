import { INPUT_METHOD } from './certificate'
import { ValueObject } from './primitives/value-object'

export const MAX_TEMPLATE_BYTES_SIZE = 5 * 1024 * 1024 // 5MB

export enum TEMPLATE_FILE_MIME_TYPE {
    PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    GOOGLE_SLIDES = 'application/vnd.google-apps.presentation',
    GOOGLE_DOCS = 'application/vnd.google-apps.document',
    DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export const TEMPLATE_MIME_TYPE_TO_FILE_EXTENSION: Record<string, string> = {
    [TEMPLATE_FILE_MIME_TYPE.DOCX]: 'docx',
    [TEMPLATE_FILE_MIME_TYPE.PPTX]: 'pptx',
    [TEMPLATE_FILE_MIME_TYPE.GOOGLE_DOCS]: 'docx',
    [TEMPLATE_FILE_MIME_TYPE.GOOGLE_SLIDES]: 'pptx',
}

export interface TemplateInput {
    driveFileId: string | null
    storageFileUrl: string
    inputMethod: INPUT_METHOD
    fileName: string
    fileMimeType: TEMPLATE_FILE_MIME_TYPE
    thumbnailUrl: string | null
    variables: string[]
}

export interface TemplateOutput extends TemplateInput {}

export interface CreateTemplateInput extends TemplateInput {}

// export interface UpdateTemplateInput
//     extends Partial<Omit<TemplateInput, 'id'>> {}

export class Template extends ValueObject<Template> {
    private readonly driveFileId: string | null
    private readonly storageFileUrl: string
    private readonly inputMethod: INPUT_METHOD
    private readonly fileName: string
    private readonly fileMimeType: TEMPLATE_FILE_MIME_TYPE
    private readonly variables: string[]
    private readonly thumbnailUrl: string | null

    constructor(data: TemplateInput) {
        super()

        if (!data.inputMethod) {
            throw new Error('Template input method is required')
        }

        if (!data.variables) {
            throw new Error('Template variables is required')
        }

        if (!data.fileName) {
            // TODO: validate regex for file name
            throw new Error('Template file name is required')
        }

        if (!data.fileMimeType) {
            throw new Error('Template file mimetype is required')
        }

        if (data.driveFileId) {
            Template.validateDriveFileId(data.driveFileId, data.inputMethod)
        }

        if (!data.storageFileUrl) {
            throw new Error('Template storage file URL is required')
        }

        this.driveFileId = data.driveFileId
        this.storageFileUrl = data.storageFileUrl
        this.inputMethod = data.inputMethod
        this.fileName = data.fileName
        this.fileMimeType = data.fileMimeType
        this.variables = data.variables
        this.thumbnailUrl = data.thumbnailUrl
    }

    getDriveFileId() {
        return this.driveFileId
    }

    getVariables() {
        return this.variables
    }

    getInputMethod() {
        return this.inputMethod
    }

    setStorageFileUrl(url: string): Template {
        return new Template({ ...this.serialize(), storageFileUrl: url })
    }

    getStorageFileUrl() {
        return this.storageFileUrl
    }

    setThumbnailUrl(url: string): Template {
        return new Template({ ...this.serialize(), thumbnailUrl: url })
    }

    equals(other: Template): boolean {
        return (
            JSON.stringify(this.serialize()) ===
            JSON.stringify(other.serialize())
        )
    }

    private static validateDriveFileId(
        driveFileId: string | null,
        inputMethod?: INPUT_METHOD,
    ) {
        if (inputMethod === INPUT_METHOD.UPLOAD && driveFileId) {
            throw new Error(
                'Drive file ID should not be provided for UPLOAD input method',
            )
        }
    }

    static getFileIdFromUrl(url: string): string | null {
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
        return match ? match[1] : null
    }

    static isValidFileMimeType(
        fileMimeType: string,
    ): fileMimeType is TEMPLATE_FILE_MIME_TYPE {
        return Object.values(TEMPLATE_FILE_MIME_TYPE).includes(
            fileMimeType as TEMPLATE_FILE_MIME_TYPE,
        )
    }

    serialize(): TemplateOutput {
        return {
            driveFileId: this.driveFileId,
            storageFileUrl: this.storageFileUrl,
            inputMethod: this.inputMethod,
            fileName: this.fileName,
            fileMimeType: this.fileMimeType,
            variables: this.variables,
            thumbnailUrl: this.thumbnailUrl,
        }
    }
}
