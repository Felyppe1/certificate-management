import { ValidationError } from '../domain/error/validation-error'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { NotFoundError } from '../domain/error/not-found-error'
import { IBucket } from './interfaces/ibucket'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'
import { DataSource, INPUT_METHOD } from '../domain/data-source'
import { DataSet } from '../domain/data-set'
import { IDataSetsRepository } from './interfaces/idata-sets-repository'

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
        private dataSetsRepository: Pick<IDataSetsRepository, 'upsert'>,
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

        const { columns, rows } = contentExtractor.extractColumns(buffer)

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

        if (certificate.hasDataSource()) {
            certificate.updateDataSource(newDataSourceInput)
        } else {
            const newDataSource = DataSource.create(newDataSourceInput)
            certificate.setDataSource(newDataSource)
        }

        await this.certificateEmissionsRepository.update(certificate)

        const newDataSet = DataSet.create({
            dataSourceId: certificate.getDataSourceId()!,
            rows,
        })

        // TODO: needs to be in a transaction
        await this.dataSetsRepository.upsert(newDataSet)

        if (dataSourceStorageFileUrl) {
            await this.bucket.deleteObject({
                bucketName: process.env.CERTIFICATES_BUCKET!,
                objectName: dataSourceStorageFileUrl,
            })
        }
    }
}
