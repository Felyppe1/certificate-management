import { ISpreadsheetContentExtractorStrategy } from '@/backend/application/interfaces/ispreadsheet-content-extractor-factory'
import { DATA_SOURCE_MIME_TYPE } from '@/backend/domain/data-source'
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

    async generate(
        columnNames: string[],
        rows: Record<string, string>[],
    ): Promise<Buffer> {
        const allRows = [
            columnNames,
            ...rows.map(row => columnNames.map(col => row[col] ?? '')),
        ]

        const csv = allRows
            .map(row => row.map(this.escapeCsv).join(','))
            .join('\n')

        return Buffer.from(csv, 'utf8')
    }

    private escapeCsv(value: string): string {
        if (
            value.includes(',') ||
            value.includes('"') ||
            value.includes('\n')
        ) {
            return `"${value.replace(/"/g, '""')}"`
        }
        return value
    }
}
