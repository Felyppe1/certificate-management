import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'

export interface IFileContentExtractorStrategy {
    extractText(buffer: Buffer): Promise<string>
}

export interface IFileContentExtractorFactory {
    create(mimeType: TEMPLATE_FILE_EXTENSION): IFileContentExtractorStrategy
}
