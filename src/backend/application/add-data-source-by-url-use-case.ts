import { ValidationError } from '../domain/error/validation-error'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { NotFoundError } from '../domain/error/not-found-error'
import { IBucket } from './interfaces/ibucket'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'
import { DataSource, INPUT_METHOD } from '../domain/data-source'

interface AddDataSourceByUrlUseCaseInput {
    certificateId: string
    fileUrl: string
    sessionToken: string
}

export class AddDataSourceByUrlUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private sessionsRepository: Pick<ISessionsRepository, 'getById'>,
        private googleDriveGateway: Pick<
            IGoogleDriveGateway,
            'getFileMetadata' | 'downloadFile'
        >,
        private spreadsheetContentExtractorFactory: ISpreadsheetContentExtractorFactory,
        private bucket: Pick<IBucket, 'deleteObject'>,
    ) {}

    async execute(input: AddDataSourceByUrlUseCaseInput) {
        const session = await this.sessionsRepository.getById(
            input.sessionToken,
        )

        if (!session) {
            throw new UnauthorizedError('session-not-found')
        }

        const certificate = await this.certificateEmissionsRepository.getById(
            input.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError('Certificate not found')
        }

        const driveFileId = DataSource.getFileIdFromUrl(input.fileUrl)

        if (!driveFileId) {
            throw new ValidationError('Invalid file URL')
        }

        const { name, fileExtension, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: driveFileId,
            })

        if (!DataSource.isValidFileExtension(fileExtension)) {
            throw new ValidationError(
                'File extension not supported for data source',
            )
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId,
            fileExtension: fileExtension,
        })

        const contentExtractor =
            this.spreadsheetContentExtractorFactory.create(fileExtension)

        const columns = contentExtractor.extractColumns(buffer)

        const dataSourceStorageFileUrl =
            certificate.getDataSourceStorageFileUrl()

        const newDataSourceInput = {
            driveFileId,
            storageFileUrl: null,
            inputMethod: INPUT_METHOD.URL,
            fileName: name,
            columns,
            fileExtension,
            thumbnailUrl,
        }

        const newDataSource = certificate.hasDataSource()
            ? new DataSource({
                  id: certificate.getDataSourceId()!,
                  ...newDataSourceInput,
              })
            : DataSource.create(newDataSourceInput)

        certificate.setDataSource(newDataSource)

        await this.certificateEmissionsRepository.update(certificate)

        if (dataSourceStorageFileUrl) {
            await this.bucket.deleteObject({
                bucketName: process.env.CERTIFICATES_BUCKET!,
                objectName: dataSourceStorageFileUrl,
            })
        }
    }
}
