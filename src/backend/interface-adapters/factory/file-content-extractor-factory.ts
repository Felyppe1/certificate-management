import { IFileContentExtractorStrategy } from '../../application/interfaces/extraction/ifile-content-extractor-factory'
import { UnsupportedTemplateMimetypeError } from '../../domain/error/validation-error/unsupported-template-mimetype-error'
import { DocxContentExtractorStrategy } from './strategy/docx-content-extractor-strategy'
import { PptxContentExtractorStrategy } from './strategy/pptx-content-extractor-strategy'
import { IFileContentExtractorFactory } from '../../application/interfaces/extraction/ifile-content-extractor-factory'
import { TEMPLATE_FILE_MIME_TYPE } from '@/backend/domain/template'

export class FileContentExtractorFactory
    implements IFileContentExtractorFactory
{
    create(
        fileMimeType: TEMPLATE_FILE_MIME_TYPE,
    ): Pick<IFileContentExtractorStrategy, 'extractText'> {
        if (
            fileMimeType === TEMPLATE_FILE_MIME_TYPE.PPTX ||
            fileMimeType === TEMPLATE_FILE_MIME_TYPE.GOOGLE_SLIDES
        ) {
            return new PptxContentExtractorStrategy()
        }

        if (
            fileMimeType === TEMPLATE_FILE_MIME_TYPE.DOCX ||
            fileMimeType === TEMPLATE_FILE_MIME_TYPE.GOOGLE_DOCS
        ) {
            return new DocxContentExtractorStrategy()
        }

        throw new UnsupportedTemplateMimetypeError()
    }
}
