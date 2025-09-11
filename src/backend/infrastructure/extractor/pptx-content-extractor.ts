import JSZip from 'jszip'
import { DOMParser } from 'xmldom'
import { FileContentExtractor } from '../../application/interfaces/file-content-extractor'

export class PptxContentExtractor implements FileContentExtractor {
    async extractText(buffer: Buffer) {
        const zip = new JSZip()
        await zip.loadAsync(buffer)

        const aNamespace =
            'http://schemas.openxmlformats.org/drawingml/2006/main'
        let extractedText = ''
        let slideIndex = 1

        while (true) {
            const slideFile = zip.file(`ppt/slides/slide${slideIndex}.xml`)
            if (!slideFile) break

            const slideXmlStr = await slideFile.async('text')
            const parser = new DOMParser()
            const xmlDoc = parser.parseFromString(
                slideXmlStr,
                'application/xml',
            )

            const textNodes = xmlDoc.getElementsByTagNameNS(aNamespace, 't')
            for (let i = 0; i < textNodes.length; i++) {
                extractedText += textNodes[i].textContent + '\n'
            }
            slideIndex++
        }

        return extractedText.trim()
    }
}
