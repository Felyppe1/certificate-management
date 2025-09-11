import { FileContentExtractor } from '../../application/interfaces/file-content-extractor'
import { ValidationError } from '../../domain/error/validation-error'
import { DocxContentExtractor } from '../extractor/docx-content-extractor'
import { PptxContentExtractor } from '../extractor/pptx-content-extractor'
import { FileContentExtractorFactory as IFileContentExtractorFactory } from '../../application/interfaces/file-content-extractor'

export class FileContentExtractorFactory
    implements IFileContentExtractorFactory
{
    create(mimeType: string): FileContentExtractor {
        if (mimeType === 'pptx') {
            return new PptxContentExtractor()
        }

        if (mimeType === 'docx') {
            return new DocxContentExtractor()
        }

        throw new ValidationError('Unsupported file type')
    }
}
