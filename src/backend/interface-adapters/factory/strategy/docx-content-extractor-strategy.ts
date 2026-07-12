import officeParser from 'officeparser'
import { IFileContentExtractorStrategy } from '../../../application/interfaces/extraction/ifile-content-extractor-factory'

export class DocxContentExtractorStrategy
    implements IFileContentExtractorStrategy
{
    async extractText(buffer: Buffer) {
        return await officeParser.parseOfficeAsync(buffer)
    }
}
