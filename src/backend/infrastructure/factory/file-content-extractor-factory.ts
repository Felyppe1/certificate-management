import { FileContentExtractor } from '../../application/interfaces/file-content-extractor'
import { ValidationError } from '../../domain/error/validation-error'
import { DocxContentExtractor } from '../extractor/docx-content-extractor'
import { PptxContentExtractor } from '../extractor/pptx-content-extractor'
import { FileContentExtractorFactory as IFileContentExtractorFactory } from '../../application/interfaces/file-content-extractor'
import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'

export class FileContentExtractorFactory
    implements IFileContentExtractorFactory
{
    create(fileExtension: TEMPLATE_FILE_EXTENSION): FileContentExtractor {
        if (
            fileExtension === TEMPLATE_FILE_EXTENSION.PPTX ||
            fileExtension === TEMPLATE_FILE_EXTENSION.GOOGLE_SLIDES
        ) {
            return new PptxContentExtractor()
        }

        if (
            fileExtension === TEMPLATE_FILE_EXTENSION.DOCX ||
            fileExtension === TEMPLATE_FILE_EXTENSION.GOOGLE_DOCS
        ) {
            return new DocxContentExtractor()
        }

        throw new ValidationError('Unsupported template file extension')
    }
}
