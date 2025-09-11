import officeParser from 'officeparser'
import { FileContentExtractor } from '../../application/interfaces/file-content-extractor'

export class DocxContentExtractor implements FileContentExtractor {
    async extractText(buffer: Buffer) {
        return await officeParser.parseOfficeAsync(buffer)
    }
}
