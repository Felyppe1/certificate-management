import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'

export interface FileContentExtractor {
    extractText(buffer: Buffer): Promise<string>
}

export interface FileContentExtractorFactory {
    create(mimeType: TEMPLATE_FILE_EXTENSION): FileContentExtractor
}
