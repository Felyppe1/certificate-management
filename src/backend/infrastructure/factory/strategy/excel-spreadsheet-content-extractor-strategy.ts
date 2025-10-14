import { ISpreadsheetContentExtractorStrategy } from '@/backend/application/interfaces/ispreadsheet-content-extractor-factory'
import * as XLSX from 'xlsx'

export class ExcelSpreadsheetContentExtractorStrategy
    implements ISpreadsheetContentExtractorStrategy
{
    extractColumns(buffer: Buffer): string[] {
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        // converte para JSON e pega as chaves (colunas)
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: null })
        const columns = Object.keys(json[0] || {})

        return columns
    }
}
