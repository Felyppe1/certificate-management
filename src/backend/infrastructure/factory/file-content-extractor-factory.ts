import { IFileContentExtractorStrategy } from '../../application/interfaces/ifile-content-extractor'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../../domain/error/validation-error'
import { DocxContentExtractorStrategy } from './strategy/docx-content-extractor-strategy'
import { PptxContentExtractorStrategy } from './strategy/pptx-content-extractor-strategy'
import { IFileContentExtractorFactory } from '../../application/interfaces/ifile-content-extractor'
import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'

export class FileContentExtractorFactory
    implements IFileContentExtractorFactory
{
    create(
        fileExtension: TEMPLATE_FILE_EXTENSION,
    ): IFileContentExtractorStrategy {
        if (
            fileExtension === TEMPLATE_FILE_EXTENSION.PPTX ||
            fileExtension === TEMPLATE_FILE_EXTENSION.GOOGLE_SLIDES
        ) {
            return new PptxContentExtractorStrategy()
        }

        if (
            fileExtension === TEMPLATE_FILE_EXTENSION.DOCX ||
            fileExtension === TEMPLATE_FILE_EXTENSION.GOOGLE_DOCS
        ) {
            return new DocxContentExtractorStrategy()
        }

        throw new ValidationError(
            VALIDATION_ERROR_TYPE.UNSUPPORTED_TEMPLATE_MIMETYPE,
        )
    }
}
