import { createId } from '@paralleldrive/cuid2'
import { ValidationError } from './error/validation-error'

export enum INPUT_METHOD {
    URL = 'URL',
    GOOGLE_DRIVE = 'GOOGLE_DRIVE',
    UPLOAD = 'UPLOAD',
}

export enum TEMPLATE_FILE_EXTENSION {
    PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    GOOGLE_SLIDES = 'application/vnd.google-apps.presentation',
    GOOGLE_DOCS = 'application/vnd.google-apps.document',
    DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

interface TemplateInput {
    id: string
    driveFileId: string | null
    storageFileUrl: string | null
    inputMethod: INPUT_METHOD
    fileName: string
    fileExtension: TEMPLATE_FILE_EXTENSION
    thumbnailUrl: string | null
    variables: string[]
}

export interface TemplateOutput extends TemplateInput {}

export interface CreateTemplateInput extends Omit<TemplateInput, 'id'> {}

export interface UpdateTemplateInput
    extends Partial<Omit<TemplateInput, 'id'>> {}

export class Template {
    private id: string
    private driveFileId: string | null
    private storageFileUrl: string | null
    private inputMethod: INPUT_METHOD
    private fileName: string
    private fileExtension: TEMPLATE_FILE_EXTENSION
    private variables: string[]
    private thumbnailUrl: string | null

    static create(data: CreateTemplateInput): Template {
        return new Template({
            id: createId(),
            ...data,
        })
    }

    constructor(data: TemplateInput) {
        if (!data.id) {
            throw new ValidationError('Template ID is required')
        }

        if (!data.inputMethod) {
            throw new ValidationError('Template input method is required')
        }

        if (!data.variables) {
            throw new ValidationError('Template variables is required')
        }

        if (!data.fileName) {
            // TODO: validate regex for file name
            throw new ValidationError('Template file name is required')
        }

        if (!data.fileExtension) {
            throw new ValidationError('Template file extension is required')
        }

        if (data.driveFileId) {
            if (data.inputMethod === INPUT_METHOD.UPLOAD) {
                throw new ValidationError(
                    'Drive file ID should not be provided for UPLOAD input method',
                )
            }
        }

        if (data.storageFileUrl) {
            if (data.inputMethod !== INPUT_METHOD.UPLOAD) {
                throw new ValidationError(
                    'File storage URL should only be provided for UPLOAD input method',
                )
            }
        }

        this.id = data.id
        this.driveFileId = data.driveFileId
        this.storageFileUrl = data.storageFileUrl
        this.inputMethod = data.inputMethod
        this.fileName = data.fileName
        this.fileExtension = data.fileExtension
        this.variables = data.variables
        this.thumbnailUrl = data.thumbnailUrl
    }

    getId() {
        return this.id
    }

    getDriveFileId() {
        return this.driveFileId
    }

    getVariables() {
        return this.variables
    }

    setStorageFileUrl(url: string) {
        this.storageFileUrl = url
    }

    getStorageFileUrl() {
        return this.storageFileUrl
    }

    setThumbnailUrl(url: string) {
        this.thumbnailUrl = url
    }

    update(data: Partial<Omit<TemplateInput, 'id'>>) {
        if (data.inputMethod) this.inputMethod = data.inputMethod

        if (data.driveFileId) {
            this.validateDriveFileId(data.driveFileId)
            this.driveFileId = data.driveFileId
        }

        if (data.storageFileUrl) {
            this.validateStorageFileUrl(data.storageFileUrl)
            this.storageFileUrl = data.storageFileUrl
        }

        if (data.fileName) this.fileName = data.fileName
        if (data.fileExtension) this.fileExtension = data.fileExtension
        if (data.variables) this.variables = data.variables
        if (data.thumbnailUrl) this.thumbnailUrl = data.thumbnailUrl
    }

    // TODO: use this in the constructor as well
    private validateDriveFileId(driveFileId: string | null) {
        if (this.inputMethod === INPUT_METHOD.UPLOAD && driveFileId) {
            throw new ValidationError(
                'Drive file ID should not be provided for UPLOAD input method',
            )
        }
    }

    private validateStorageFileUrl(storageFileUrl: string | null) {
        if (this.inputMethod !== INPUT_METHOD.UPLOAD && storageFileUrl) {
            throw new ValidationError(
                'File storage URL should only be provided for UPLOAD input method',
            )
        }
    }

    static getFileIdFromUrl(url: string): string | null {
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/)
        return match ? match[1] : null
    }

    static extractVariablesFromContent(content: string): string[] {
        const matches = [...content.matchAll(/\{\{\s*([\w.-]+)\s*\}\}/g)]
        const variables = matches.map(match => match[1])
        const uniqueVariables = Array.from(new Set(variables))

        return uniqueVariables
    }

    static isValidFileExtension(
        fileExtension: string,
    ): fileExtension is TEMPLATE_FILE_EXTENSION {
        return Object.values(TEMPLATE_FILE_EXTENSION).includes(
            fileExtension as TEMPLATE_FILE_EXTENSION,
        )
    }

    serialize(): TemplateOutput {
        return {
            id: this.id,
            driveFileId: this.driveFileId,
            storageFileUrl: this.storageFileUrl,
            inputMethod: this.inputMethod,
            fileName: this.fileName,
            fileExtension: this.fileExtension,
            variables: this.variables,
            thumbnailUrl: this.thumbnailUrl,
        }
    }
}
