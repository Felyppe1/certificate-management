import { createId } from '@paralleldrive/cuid2'
import { ValidationError } from './error/validation-error'

export enum INPUT_METHOD {
    URL = 'URL',
    GOOGLE_DRIVE = 'GOOGLE_DRIVE',
    UPLOAD = 'UPLOAD',
}

export enum TEMPLATE_FILE_EXTENSION {
    DOCX = 'DOCX',
    GOOGLE_DOCS = 'GOOGLE_DOCS',
    PPTX = 'PPTX',
    GOOGLE_SLIDES = 'GOOGLE_SLIDES',
}

interface TemplateInput {
    id: string
    driveFileId: string | null
    storageFileUrl: string | null
    inputMethod: INPUT_METHOD
    fileName: string
    fileExtension: TEMPLATE_FILE_EXTENSION
    variables: string[]
}

interface CreateTemplateInput extends Omit<TemplateInput, 'id'> {}

export class Template {
    private id: string
    private driveFileId: string | null
    private storageFileUrl: string | null
    private inputMethod: INPUT_METHOD
    private fileName: string
    private fileExtension: TEMPLATE_FILE_EXTENSION
    private variables: string[]

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
    }

    getId() {
        return this.id
    }

    getDriveFileId() {
        return this.driveFileId
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

    serialize(): TemplateInput {
        return {
            id: this.id,
            driveFileId: this.driveFileId,
            storageFileUrl: this.storageFileUrl,
            inputMethod: this.inputMethod,
            fileName: this.fileName,
            fileExtension: this.fileExtension,
            variables: this.variables,
        }
    }
}
