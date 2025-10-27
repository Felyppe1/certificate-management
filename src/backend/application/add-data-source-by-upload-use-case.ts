import { DataSet } from '../domain/data-set'
import {
    DATA_SOURCE_FILE_EXTENSION,
    DataSource,
    INPUT_METHOD,
} from '../domain/data-source'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { IBucket } from './interfaces/ibucket'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { IDataSetsRepository } from './interfaces/idata-sets-repository'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'
import { DocumentProcessorServiceClient } from '@google-cloud/documentai'

const documentAiClient = new DocumentProcessorServiceClient()

interface AddDataSourceByUploadUseCaseInput {
    file: File
    certificateId: string
    sessionToken: string
}

const MIME_TYPE_TO_FILE_EXTENSION: Record<string, string> = {
    [DATA_SOURCE_FILE_EXTENSION.CSV]: 'csv',
    [DATA_SOURCE_FILE_EXTENSION.XLSX]: 'xlsx',
}

export class AddDataSourceByUploadUseCase {
    constructor(
        private bucket: IBucket,
        private sessionsRepository: ISessionsRepository,
        private certificatesRepository: ICertificatesRepository,
        private dataSetsRepository: Pick<IDataSetsRepository, 'upsert'>,
        private spreadsheetContentExtractorFactory: ISpreadsheetContentExtractorFactory,
    ) {}

    async execute(input: AddDataSourceByUploadUseCaseInput) {
        const bytes = await input.file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const name = `projects/${process.env.GCP_PROJECT_ID}/locations/us/processors/63d2bfdfbe5e544`

        const request = {
            name,
            rawDocument: {
                content: buffer.toString('base64'),
                mimeType: input.file.type,
            },
        }

        const [result] = await documentAiClient.processDocument(request)
        const { document } = result

        function extractText(textAnchor, fullText) {
            if (!textAnchor?.textSegments || !fullText) return ''
            return textAnchor.textSegments
                .map(seg =>
                    fullText.substring(
                        parseInt(seg.startIndex) || 0,
                        parseInt(seg.endIndex),
                    ),
                )
                .join('')
                .trim()
        }

        function parseTables(document) {
            const fullText = document.text
            const pages = document.pages || []

            const allTables = []

            for (const page of pages) {
                for (const table of page.tables || []) {
                    // Cabeçalhos (headerRows)
                    const headers = (table.headerRows || []).flatMap(row =>
                        row.cells.map(cell =>
                            extractText(cell.layout.textAnchor, fullText),
                        ),
                    )

                    // Corpo (bodyRows)
                    const rows = (table.bodyRows || []).map(row =>
                        row.cells.map(cell =>
                            extractText(cell.layout.textAnchor, fullText),
                        ),
                    )

                    allTables.push({ headers, rows })
                }
            }

            return allTables
        }

        const tables = parseTables(document)

        console.log('Extracted Tables:', JSON.stringify(tables, null, 2))

        // Get all of the document text as one big string
        // const {text} = document;

        // // Extract shards from the text field
        // const getText = textAnchor => {
        //     if (!textAnchor.textSegments || textAnchor.textSegments.length === 0) {
        //     return '';
        //     }

        //     // First shard in document doesn't have startIndex property
        //     const startIndex = textAnchor.textSegments[0].startIndex || 0;
        //     const endIndex = textAnchor.textSegments[0].endIndex;

        //     return text.substring(startIndex, endIndex);
        // };

        // // Read the text recognition output from the processor
        // console.log('The document contains the following paragraphs:');
        // const [page1] = document.pages;
        // const {paragraphs} = page1;

        // for (const paragraph of paragraphs) {
        //     const paragraphText = getText(paragraph.layout.textAnchor);
        //     console.log(`Paragraph text:\n${paragraphText}`);
        // }

        // const session = await this.sessionsRepository.getById(
        //     input.sessionToken,
        // )

        // if (!session) {
        //     throw new AuthenticationError('session-not-found')
        // }

        // const certificate = await this.certificatesRepository.getById(
        //     input.certificateId,
        // )

        // if (!certificate) {
        //     throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        // }

        // if (certificate.getUserId() !== session.userId) {
        //     throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        // }

        // const fileExtension = input.file.type

        // if (!DataSource.isValidFileExtension(fileExtension)) {
        //     throw new ValidationError(
        //         VALIDATION_ERROR_TYPE.UNSUPPORTED_DATA_SOURCE_MIMETYPE,
        //     )
        // }

        // const bytes = await input.file.arrayBuffer()
        // const buffer = Buffer.from(bytes)

        // const contentExtractor =
        //     this.spreadsheetContentExtractorFactory.create(fileExtension)

        // const { columns, rows } = contentExtractor.extractColumns(buffer)

        // const previousDataSourceStorageFileUrl =
        //     certificate.getDataSourceStorageFileUrl()

        // const newDataSourceInput = {
        //     inputMethod: INPUT_METHOD.UPLOAD,
        //     driveFileId: null,
        //     storageFileUrl: null,
        //     fileName: input.file.name,
        //     fileExtension,
        //     columns,
        //     thumbnailUrl: null,
        // }

        // if (certificate.hasDataSource()) {
        //     certificate.updateDataSource(newDataSourceInput)
        // } else {
        //     certificate.setDataSource(newDataSourceInput)
        // }

        // const path = `users/${session.userId}/data-sources/${certificate.getDataSourceId()}-original.${MIME_TYPE_TO_FILE_EXTENSION[fileExtension]}`

        // certificate.setDataSourceStorageFileUrl(path)

        // await this.bucket.uploadObject({
        //     buffer,
        //     bucketName: process.env.CERTIFICATES_BUCKET!,
        //     objectName: path,
        //     mimeType: fileExtension,
        // })

        // await this.certificatesRepository.update(certificate)

        // const newDataSet = DataSet.create({
        //     dataSourceId: certificate.getDataSourceId()!,
        //     rows,
        // })

        // await this.dataSetsRepository.upsert(newDataSet)

        // // TODO: it should be done using outbox pattern
        // if (previousDataSourceStorageFileUrl) {
        //     await this.bucket.deleteObject({
        //         bucketName: process.env.CERTIFICATES_BUCKET!,
        //         objectName: previousDataSourceStorageFileUrl,
        //     })
        // }
    }
}
