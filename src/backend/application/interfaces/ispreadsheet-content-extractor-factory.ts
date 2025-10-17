import { DATA_SOURCE_FILE_EXTENSION } from '@/backend/domain/data-source'

interface ExtractColumns {
    columns: string[]
    rows: Record<string, any>[]
}

export interface ISpreadsheetContentExtractorStrategy {
    extractColumns(buffer: Buffer): ExtractColumns
}

export interface ISpreadsheetContentExtractorFactory {
    create(
        mimeType: DATA_SOURCE_FILE_EXTENSION,
    ): ISpreadsheetContentExtractorStrategy
}
