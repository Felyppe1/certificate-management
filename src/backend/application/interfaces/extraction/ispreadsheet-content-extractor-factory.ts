import { DATA_SOURCE_MIME_TYPE } from '@/backend/domain/data-source'

export interface ExtractColumns {
    columns: string[]
    rows: Record<string, any>[]
}

export interface ISpreadsheetContentExtractorStrategy {
    extractColumns(buffers: Buffer[]): Promise<ExtractColumns>
    generate(
        columnNames: string[],
        rows: Record<string, string>[],
    ): Promise<Buffer>
}

export interface ISpreadsheetContentExtractorFactory {
    create(
        mimeType: DATA_SOURCE_MIME_TYPE,
    ): Pick<ISpreadsheetContentExtractorStrategy, 'extractColumns'>
}

export interface ISpreadsheetGeneratorFactory {
    create(
        mimeType: DATA_SOURCE_MIME_TYPE.CSV | DATA_SOURCE_MIME_TYPE.XLSX,
    ): ISpreadsheetContentExtractorStrategy
}
