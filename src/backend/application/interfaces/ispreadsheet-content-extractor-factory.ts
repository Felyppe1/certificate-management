import { DATA_SOURCE_MIME_TYPE } from '@/backend/domain/data-source'

export interface ExtractColumns {
    columns: string[]
    rows: Record<string, any>[]
}

export interface ISpreadsheetContentExtractorStrategy {
    extractColumns(buffer: Buffer): Promise<ExtractColumns>
}

export interface ISpreadsheetContentExtractorFactory {
    create(
        mimeType: DATA_SOURCE_MIME_TYPE,
    ): ISpreadsheetContentExtractorStrategy
}
