import { ISpreadsheetContentExtractorStrategy } from '@/backend/application/interfaces/ispreadsheet-content-extractor-factory'
import { parse } from 'csv-parse/sync'

export class CsvSpreadsheetContentExtractorStrategy
    implements ISpreadsheetContentExtractorStrategy
{
    extractColumns(buffer: Buffer): string[] {
        const content = buffer.toString('utf8')

        const records = parse(content, {
            columns: true, // use the first line as header
            skip_empty_lines: true,
        })

        const headers = Object.keys(records[0] || {})
        return headers
    }
}
