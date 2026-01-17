import JSZip from 'jszip'
import { DOMParser } from 'xmldom'
import { IFileContentExtractorStrategy } from '../../../application/interfaces/ifile-content-extractor-factory'

export class PptxContentExtractorStrategy
    implements IFileContentExtractorStrategy
{
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
                extractedText += textNodes[i].textContent
            }
            extractedText += '\n'
            slideIndex++
        }

        return this.normalizeLiquidSyntax(extractedText.trim())
    }

    private normalizeLiquidSyntax(content: string): string {
        return (
            content
                // Normalize {{ variables }}
                .replace(/{{([\s\S]*?)}}/g, (_, inner) => {
                    const normalized = inner.replace(/\s+/g, '')
                    return `{{ ${normalized} }}`
                })
                // Normalize {% blocks %}
                .replace(/{%([\s\S]*?)%}/g, (_, inner) => {
                    const normalized = inner.replace(/\s+/g, ' ').trim()
                    return `{% ${normalized} %}`
                })
        )
    }
}
