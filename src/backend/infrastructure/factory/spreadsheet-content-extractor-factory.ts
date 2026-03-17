import {
    ISpreadsheetContentExtractorFactory,
    ISpreadsheetContentExtractorStrategy,
} from '@/backend/application/interfaces/ispreadsheet-content-extractor-factory'
import { DATA_SOURCE_MIME_TYPE } from '@/backend/domain/data-source'
import { CsvSpreadsheetContentExtractorStrategy } from './strategy/csv-spreadsheet-content-extractor-strategy'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '@/backend/domain/error/validation-error'
import { ExcelSpreadsheetContentExtractorStrategy } from './strategy/excel-spreadsheet-content-extractor-strategy'
import { ImageContentExtractorStrategy } from './strategy/image-content-extractor-strategy'

export class SpreadsheetContentExtractorFactory
    implements ISpreadsheetContentExtractorFactory
{
    create(
        mimeType: DATA_SOURCE_MIME_TYPE,
    ): ISpreadsheetContentExtractorStrategy {
        switch (mimeType) {
            case DATA_SOURCE_MIME_TYPE.XLSX:
                return new ExcelSpreadsheetContentExtractorStrategy()

            case DATA_SOURCE_MIME_TYPE.CSV:
            case DATA_SOURCE_MIME_TYPE.GOOGLE_SHEETS:
                return new CsvSpreadsheetContentExtractorStrategy()

            case DATA_SOURCE_MIME_TYPE.PNG:
            case DATA_SOURCE_MIME_TYPE.JPEG:
                return new ImageContentExtractorStrategy()

            default:
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.UNSUPPORTED_DATA_SOURCE_MIMETYPE,
                )
        }
    }
}
