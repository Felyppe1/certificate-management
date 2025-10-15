import { DATA_SOURCE_FILE_EXTENSION } from '@/backend/domain/data-source'

export interface ISpreadsheetContentExtractorStrategy {
    extractColumns(buffer: Buffer): string[]
}

export interface ISpreadsheetContentExtractorFactory {
    create(
        mimeType: DATA_SOURCE_FILE_EXTENSION,
    ): ISpreadsheetContentExtractorStrategy
}
