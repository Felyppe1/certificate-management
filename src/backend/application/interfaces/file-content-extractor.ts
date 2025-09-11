export interface FileContentExtractor {
    extractText(buffer: Buffer): Promise<string>
}

export interface FileContentExtractorFactory {
    create(mimeType: string): FileContentExtractor
}
