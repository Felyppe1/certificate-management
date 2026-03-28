import { ISpreadsheetContentExtractorStrategy } from '@/backend/application/interfaces/ispreadsheet-content-extractor-factory'
import { ServiceUnavailableError } from '@/backend/domain/error/service-unavailable-error'
import { GenerateContentResponse, GoogleGenAI } from '@google/genai'
import { fileTypeFromBuffer } from 'file-type'

const prompt = `
Vou te enviar uma lista escrita à mão.
Ela pode conter informações como email, nome, ... de pessoas brasileiras.
Me retorne os valores extraídos da lista da imagem (se tiver) sem deixar NENHUMA linha de fora!
O retorno deve ser um array de objetos com as chaves sendo as colunas e os valores preenchidos de acordo com a lista.
Retorne todos os valores como STRINGS.
Se não tiver nome das colunas explicitamente, chame a coluna de acordo com os valores dela com a primeira letra maiúscula.
Se tiver uma coluna de nome, coloque os valores com cada primeira palavra do nome maiúscula.
Se você não conseguir extrar um valor para uma célula, coloque o valor como string vazia '', não adicione traços nem nada.
Não retorne nada mais além do json, apenas o json puro (sem \`\`\`json antes ou depois).
`

export class ImageContentExtractorStrategy
    implements ISpreadsheetContentExtractorStrategy
{
    // TODO: receive the file mime type through constructor?
    async extractColumns(buffer: Buffer) {
        const genAiClient = new GoogleGenAI({})
        const base64ImageFile = buffer.toString('base64')

        const mimeType = await fileTypeFromBuffer(buffer)

        const contents = [
            {
                inlineData: {
                    mimeType: mimeType?.mime || 'image/jpeg',
                    data: base64ImageFile,
                },
            },
            {
                text: prompt,
            },
        ]

        let rows: Record<string, any>[] = []
        let response: GenerateContentResponse | undefined = undefined
        try {
            response = await genAiClient.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: contents,
            })

            rows = JSON.parse(response.text as string)
        } catch (error: any) {
            if (error?.message) {
                const errorData = JSON.parse(error.message)

                const isHighDemandError =
                    errorData?.error?.code === 503 &&
                    errorData?.error?.message.includes('high demand')

                if (isHighDemandError) {
                    throw new ServiceUnavailableError('genai-api-unavailable')
                }
            }

            console.error('Failed to parse JSON from GenAI response:', error)
            console.log('GenAI response text was:', response?.text)
        }

        return { columns: [], rows }
    }
}
