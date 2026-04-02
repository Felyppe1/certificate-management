import { ISpreadsheetContentExtractorStrategy } from '@/backend/application/interfaces/ispreadsheet-content-extractor-factory'
import { parse } from 'csv-parse/sync'

export class CsvSpreadsheetContentExtractorStrategy
    implements ISpreadsheetContentExtractorStrategy
{
    async extractColumns(buffers: Buffer[]) {
        const content = buffers[0].toString('utf8')

        const records = parse(content, {
            columns: true,
            trim: true,
            skip_empty_lines: true,
        }) as Record<string, any>[]

        const columns =
            records.length > 0
                ? Object.keys(records[0])
                : (parse(content, { to_line: 1, trim: true })[0] ?? [])

        return {
            columns,
            rows: records,
        }
    }
}
