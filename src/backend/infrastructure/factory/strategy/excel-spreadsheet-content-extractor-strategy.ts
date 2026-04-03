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

        const records = XLSX.utils.sheet_to_json<Record<string, any>>(
            worksheet,
            {
                defval: null,
                blankrows: false,
                raw: false,
            },
        )

        console.log(records)

        const columns = records.length > 0 ? Object.keys(records[0]) : []

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
