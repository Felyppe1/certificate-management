import { TEMPLATE_FILE_MIME_TYPE } from '@/backend/domain/template'

export interface IFileContentExtractorStrategy {
    extractText(buffer: Buffer): Promise<string>
}

export interface IFileContentExtractorFactory {
    create(mimeType: TEMPLATE_FILE_MIME_TYPE): IFileContentExtractorStrategy
}
