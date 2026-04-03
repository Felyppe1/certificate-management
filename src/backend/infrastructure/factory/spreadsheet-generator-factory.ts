import {
    ISpreadsheetContentExtractorStrategy,
    ISpreadsheetGeneratorFactory,
} from '@/backend/application/interfaces/ispreadsheet-content-extractor-factory'
import { DATA_SOURCE_MIME_TYPE } from '@/backend/domain/data-source'
import { CsvSpreadsheetContentExtractorStrategy } from './strategy/csv-spreadsheet-content-extractor-strategy'
import { ExcelSpreadsheetContentExtractorStrategy } from './strategy/excel-spreadsheet-content-extractor-strategy'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '@/backend/domain/error/validation-error'

export class SpreadsheetGeneratorFactory
    implements ISpreadsheetGeneratorFactory
{
    create(
        mimeType: DATA_SOURCE_MIME_TYPE.CSV | DATA_SOURCE_MIME_TYPE.XLSX,
    ): ISpreadsheetContentExtractorStrategy {
        switch (mimeType) {
            case DATA_SOURCE_MIME_TYPE.XLSX:
                return new ExcelSpreadsheetContentExtractorStrategy()
            case DATA_SOURCE_MIME_TYPE.CSV:
                return new CsvSpreadsheetContentExtractorStrategy()
            default:
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.UNSUPPORTED_DATA_SOURCE_MIMETYPE,
                )
        }
    }
}
