import officeParser from 'officeparser'
import { IFileContentExtractorStrategy } from '../../../application/interfaces/ifile-content-extractor'

export class DocxContentExtractorStrategy
    implements IFileContentExtractorStrategy
{
    async extractText(buffer: Buffer) {
        return await officeParser.parseOfficeAsync(buffer)
    }
}
