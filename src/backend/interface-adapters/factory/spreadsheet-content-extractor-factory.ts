import {
    ISpreadsheetContentExtractorFactory,
    ISpreadsheetContentExtractorStrategy,
} from '@/backend/application/interfaces/extraction/ispreadsheet-content-extractor-factory'
import { DATA_SOURCE_MIME_TYPE } from '@/backend/domain/data-source'
import { CsvSpreadsheetContentExtractorStrategy } from './strategy/csv-spreadsheet-content-extractor-strategy'
import { UnsupportedDataSourceMimetypeError } from '@/backend/domain/error/validation-error/unsupported-data-source-mimetype-error'
import { ExcelSpreadsheetContentExtractorStrategy } from './strategy/excel-spreadsheet-content-extractor-strategy'
import { ImageContentExtractorStrategy } from './strategy/image-content-extractor-strategy'

export class SpreadsheetContentExtractorFactory
    implements ISpreadsheetContentExtractorFactory
{
    create(
        mimeType: DATA_SOURCE_MIME_TYPE,
    ): Pick<ISpreadsheetContentExtractorStrategy, 'extractColumns'> {
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
                throw new UnsupportedDataSourceMimetypeError()
        }
    }
}
