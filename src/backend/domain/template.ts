import { createId } from '@paralleldrive/cuid2'
import { ValidationError } from './error/validation-error'

export enum TEMPLATE_TYPE {
    URL = 'URL',
    GOOGLE_DRIVE = 'GOOGLE_DRIVE',
    UPLOAD = 'UPLOAD',
}

interface TemplateInput {
    id: string
    fileId: string | null
    bucketUrl: string | null
    type: TEMPLATE_TYPE
    fileName: string
    variables: string[]
}

interface CreateTemplateInput extends Omit<TemplateInput, 'id'> {}

export class Template {
    private id: string
    private fileId: string | null
    private bucketUrl: string | null
    private type: TEMPLATE_TYPE
    private fileName: string
    private variables: string[]

    constructor(data: TemplateInput) {
        if (!data.id) {
            throw new ValidationError('Template ID is required')
        }

        if (!data.type) {
            throw new ValidationError('Template type is required')
        }

        if (!data.variables) {
            throw new ValidationError('Template variables is required')
        }

        if (!data.fileName) {
            // TODO: validate regex for file name
            throw new ValidationError('Template file name is required')
        }

        if (data.type === TEMPLATE_TYPE.URL && !data.fileId) {
            throw new ValidationError('File ID is required for URL templates')
        }

        if (data.type === TEMPLATE_TYPE.GOOGLE_DRIVE && !data.fileId) {
            throw new ValidationError(
                'File ID is required for GOOGLE_DRIVE templates',
            )
        }

        if (data.type === TEMPLATE_TYPE.UPLOAD && !data.bucketUrl) {
            throw new ValidationError(
                'Bucket URL is required for UPLOAD templates',
            )
        }

        this.id = data.id
        this.fileId = data.fileId
        this.bucketUrl = data.bucketUrl
        this.type = data.type
        this.fileName = data.fileName
        this.variables = data.variables
    }

    static create(data: CreateTemplateInput): Template {
        return new Template({
            id: createId(),
            ...data,
        })
    }

    getId() {
        return this.id
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
            fileId: this.fileId,
            bucketUrl: this.bucketUrl,
            type: this.type,
            fileName: this.fileName,
            variables: this.variables,
        }
    }
}
