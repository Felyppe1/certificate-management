export interface ISpreadsheetContentExtractorStrategy {
    extractColumns(buffer: Buffer): string[]
}

export interface ISpreadsheetContentExtractorFactory {
    create(mimeType: string): ISpreadsheetContentExtractorStrategy
}
