import { ISpreadsheetContentExtractorStrategy } from '@/backend/application/interfaces/ispreadsheet-content-extractor-factory'
import { DATA_SOURCE_MIME_TYPE } from '@/backend/domain/data-source'
import * as XLSX from 'xlsx'

export class ExcelSpreadsheetContentExtractorStrategy
    implements ISpreadsheetContentExtractorStrategy
{
    async extractColumns(buffers: Buffer[]) {
        const workbook = XLSX.read(buffers[0], {
            type: 'buffer',
            cellDates: true,
        })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        const columns =
            XLSX.utils.sheet_to_json<string[]>(worksheet, {
                defval: null,
                blankrows: false,
                raw: false,
                header: 1,
                range: 0,
            })[0] || []

        const records = XLSX.utils.sheet_to_json<Record<string, any>>(
            worksheet,
            {
                header: columns,
                range: 1,
                defval: null,
                blankrows: false,
                raw: false,
            },
        )

        return {
            columns,
            rows: records,
        }
    }

    async generate(
        columnNames: string[],
        rows: Record<string, string>[],
    ): Promise<Buffer> {
        const worksheetData = [
            columnNames,
            ...rows.map(row => columnNames.map(col => row[col] ?? '')),
        ]

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.aoa_to_sheet(worksheetData)
        XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')

        return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    }
}
