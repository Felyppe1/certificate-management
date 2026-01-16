import { INPUT_METHOD } from './certificate'

export enum TEMPLATE_FILE_EXTENSION {
    PPTX = 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    GOOGLE_SLIDES = 'application/vnd.google-apps.presentation',
    GOOGLE_DOCS = 'application/vnd.google-apps.document',
    DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}

export interface TemplateInput {
    driveFileId: string | null
    storageFileUrl: string
    inputMethod: INPUT_METHOD
    fileName: string
    fileExtension: TEMPLATE_FILE_EXTENSION
    thumbnailUrl: string | null
    variables: string[]
}

export interface TemplateOutput extends TemplateInput {}

export interface CreateTemplateInput extends TemplateInput {}

// export interface UpdateTemplateInput
//     extends Partial<Omit<TemplateInput, 'id'>> {}

export class Template {
    private driveFileId: string | null
    private storageFileUrl: string
    private inputMethod: INPUT_METHOD
    private fileName: string
    private fileExtension: TEMPLATE_FILE_EXTENSION
    private variables: string[]
    private thumbnailUrl: string | null

    constructor(data: TemplateInput) {
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

        if (!data.fileExtension) {
            throw new Error('Template file extension is required')
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
        this.fileExtension = data.fileExtension
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

        if (data.driveFileId !== undefined) {
            Template.validateDriveFileId(data.driveFileId, data.inputMethod)
            this.driveFileId = data.driveFileId
        }

        if (data.storageFileUrl !== undefined) {
            this.storageFileUrl = data.storageFileUrl
        }

        if (data.fileName) this.fileName = data.fileName
        if (data.fileExtension) this.fileExtension = data.fileExtension
        if (data.variables) this.variables = data.variables
        if (data.thumbnailUrl !== undefined)
            this.thumbnailUrl = data.thumbnailUrl
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
