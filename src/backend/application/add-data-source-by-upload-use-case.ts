import {
    DATA_SOURCE_FILE_EXTENSION,
    DataSource,
    INPUT_METHOD,
} from '../domain/data-source'
import { ForbiddenError } from '../domain/error/forbidden-error'
import { NotFoundError } from '../domain/error/not-found-error'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { ValidationError } from '../domain/error/validation-error'
import { IBucket } from './interfaces/ibucket'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'

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
        private spreadsheetContentExtractorFactory: ISpreadsheetContentExtractorFactory,
    ) {}

    async execute(input: AddDataSourceByUploadUseCaseInput) {
        const session = await this.sessionsRepository.getById(
            input.sessionToken,
        )

        if (!session) {
            throw new UnauthorizedError('session-not-found')
        }

        const certificate = await this.certificatesRepository.getById(
            input.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError('Certificate not found')
        }

        if (certificate.getUserId() !== session.userId) {
            throw new ForbiddenError('Forbidden')
        }

        const fileExtension = input.file.type

        if (!DataSource.isValidFileExtension(fileExtension)) {
            throw new ValidationError(
                'File extension not supported for data source',
            )
        }

        const bytes = await input.file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const contentExtractor =
            this.spreadsheetContentExtractorFactory.create(fileExtension)

        const columns = contentExtractor.extractColumns(buffer)

        const previousDataSourceStorageFileUrl =
            certificate.getDataSourceStorageFileUrl()

        const newDataSourceInput = {
            inputMethod: INPUT_METHOD.UPLOAD,
            driveFileId: null,
            storageFileUrl: null,
            fileName: input.file.name,
            fileExtension,
            columns,
            thumbnailUrl: null,
        }

        const newDataSource = certificate.hasTemplate()
            ? new DataSource({
                  id: certificate.getDataSourceId()!,
                  ...newDataSourceInput,
              })
            : DataSource.create(newDataSourceInput)

        certificate.setDataSource(newDataSource)

        const path = `users/${session.userId}/data-sources/${certificate.getDataSourceId()}-original.${MIME_TYPE_TO_FILE_EXTENSION[fileExtension]}`

        certificate.setDataSourceStorageFileUrl(path)

        await this.bucket.uploadObject({
            buffer,
            bucketName: process.env.CERTIFICATES_BUCKET!,
            objectName: path,
            mimeType: fileExtension,
        })

        await this.certificatesRepository.update(certificate)

        // TODO: it should be done using outbox pattern
        if (previousDataSourceStorageFileUrl) {
            await this.bucket.deleteObject({
                bucketName: process.env.CERTIFICATES_BUCKET!,
                objectName: previousDataSourceStorageFileUrl,
            })
        }
    }
}
