import { ISpreadsheetContentExtractorStrategy } from '@/backend/application/interfaces/ispreadsheet-content-extractor-factory'
import * as XLSX from 'xlsx'

export class ExcelSpreadsheetContentExtractorStrategy
    implements ISpreadsheetContentExtractorStrategy
{
    extractColumns(buffer: Buffer) {
        const workbook = XLSX.read(buffer, { type: 'buffer' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        const records = XLSX.utils.sheet_to_json<Record<string, any>>(
            worksheet,
            {
                defval: null,
                blankrows: false,
            },
        )

        const columns = records.length > 0 ? Object.keys(records[0]) : []
        // const records = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, {
        //     defval: null, // mantém células vazias como null
        //     raw: false,   // converte valores formatados (datas, etc.)
        //     blankrows: false, // ignora linhas completamente vazias
        //     header: 1, // pegará a linha de cabeçalho também
        // })

        // // Se usarmos header: 1, a primeira linha contém as colunas
        // const [headerRow, ...dataRows] = records

        // // Monta objetos linha = { coluna: valor }
        // const columns = (headerRow as string[]) ?? []
        // const rows = dataRows.map((row) => {
        //     const obj: Record<string, any> = {}
        //     columns.forEach((col, i) => (obj[col] = (row as any[])[i] ?? null))
        //     return obj
        // })

        return {
            columns,
            rows: records,
        }
    }
}
