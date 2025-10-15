import {
    ISpreadsheetContentExtractorFactory,
    ISpreadsheetContentExtractorStrategy,
} from '@/backend/application/interfaces/ispreadsheet-content-extractor-factory'
import { DATA_SOURCE_FILE_EXTENSION } from '@/backend/domain/data-source'
import { CsvSpreadsheetContentExtractorStrategy } from './strategy/csv-spreadsheet-content-extractor-strategy'
import { ValidationError } from '@/backend/domain/error/validation-error'
import { ExcelSpreadsheetContentExtractorStrategy } from './strategy/excel-spreadsheet-content-extractor-strategy'

export class SpreadsheetContentExtractorFactory
    implements ISpreadsheetContentExtractorFactory
{
    create(
        mimeType: DATA_SOURCE_FILE_EXTENSION,
    ): ISpreadsheetContentExtractorStrategy {
        switch (mimeType) {
            case DATA_SOURCE_FILE_EXTENSION.XLSX:
                return new ExcelSpreadsheetContentExtractorStrategy()

            case DATA_SOURCE_FILE_EXTENSION.CSV:
            case DATA_SOURCE_FILE_EXTENSION.GOOGLE_SHEETS:
                return new CsvSpreadsheetContentExtractorStrategy()

            default:
                throw new ValidationError(
                    'Unsupported data source file extension',
                )
        }
    }
}
