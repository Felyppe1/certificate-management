import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'

import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'

import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { IBucket } from './interfaces/cloud/ibucket'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'
import { INPUT_METHOD } from '../domain/certificate'
import {
    DATA_SOURCE_MIME_TYPE,
    DataSource,
    MAX_IMAGE_FILES,
} from '../domain/data-source'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { DataSourceDomainService } from '../domain/domain-service/data-source-domain-service'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'

interface AddDataSourceByUrlUseCaseInput {
    certificateId: string
    fileUrls: string[]
    userId: string
}

export class AddDataSourceByUrlUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'saveMany' | 'deleteManyByCertificateEmissionId'
        >,
        private googleDriveGateway: Pick<
            IGoogleDriveGateway,
            'getFileMetadata' | 'downloadFile'
        >,
        private spreadsheetContentExtractorFactory: Pick<
            ISpreadsheetContentExtractorFactory,
            'create'
        >,
        private bucket: Pick<IBucket, 'deleteObject'>,
        private transactionManager: Pick<ITransactionManager, 'run'>,
        private usersRepository: Pick<IUsersRepository, 'getById'>,
    ) {}

    async execute(input: AddDataSourceByUrlUseCaseInput) {
        const certificateEmission =
            await this.certificateEmissionsRepository.getById(
                input.certificateId,
            )

        if (!certificateEmission) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (!certificateEmission.isOwner(input.userId)) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        if (certificateEmission.isEmitted()) {
            throw new ValidationError(VALIDATION_ERROR_TYPE.CERTIFICATE_EMITTED)
        }

        const driveFileIds = input.fileUrls.map(fileUrl => {
            const driveFileId = DataSource.getFileIdFromUrl(fileUrl)

            if (!driveFileId) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.UNEXISTENT_DATA_SOURCE_DRIVE_FILE_ID,
                )
            }

            return driveFileId
        })

        const user = await this.usersRepository.getById(input.userId)
        const externalAccount = user?.getExternalAccount('GOOGLE')

        const filesMetadata = await Promise.all(
            driveFileIds.map(fileId =>
                this.googleDriveGateway.getFileMetadata({
                    fileId,
                    userAccessToken: externalAccount?.getAccessToken(),
                    userRefreshToken:
                        externalAccount?.getRefreshToken() || undefined,
                }),
            ),
        )

        for (const metadata of filesMetadata) {
            if (!DataSource.isValidFileMimeType(metadata.fileMimeType)) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.UNSUPPORTED_DATA_SOURCE_MIMETYPE,
                )
            }
        }

        const fileMimeType = filesMetadata[0]
            .fileMimeType as DATA_SOURCE_MIME_TYPE

        const isImage = DataSource.isImageMimeType(fileMimeType)

        if (isImage) {
            if (driveFileIds.length > MAX_IMAGE_FILES) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.DATA_SOURCE_IMAGE_FILES_EXCEEDED,
                )
            }

            const allFilesAreImages = filesMetadata.every(metadata =>
                DataSource.isImageMimeType(metadata.fileMimeType),
            )

            if (!allFilesAreImages) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.DATA_SOURCE_ALL_FILES_NOT_IMAGES,
                )
            }
        } else {
            if (driveFileIds.length !== 1) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.DATA_SOURCE_ALL_FILES_NOT_IMAGES,
                )
            }
        }

        const buffers = await Promise.all(
            driveFileIds.map((driveFileId, index) =>
                this.googleDriveGateway.downloadFile({
                    driveFileId,
                    fileMimeType: filesMetadata[index].fileMimeType,
                    accessToken: externalAccount?.getAccessToken(),
                }),
            ),
        )

        const contentExtractor =
            this.spreadsheetContentExtractorFactory.create(fileMimeType)

        const { rows, columns } = await contentExtractor.extractColumns(buffers)

        // In case it had files in storage, delete them
        const dataSourceStorageFileUrls =
            certificateEmission.getDataSourceStorageFileUrls()

        const dataSourceDomainService = new DataSourceDomainService()

        const dataSourceRows = dataSourceDomainService.createDataSource({
            certificate: certificateEmission,
            newDataSourceData: {
                files: driveFileIds.map((driveFileId, index) => ({
                    driveFileId,
                    storageFileUrl: null,
                    fileName: filesMetadata[index].name,
                })),
                fileMimeType,
                inputMethod: INPUT_METHOD.URL,
                thumbnailUrl: filesMetadata[0].thumbnailUrl,
                columnsRow: 1,
                dataRowStart: 2,
                columns,
                rows,
            },
        })

        await this.transactionManager.run(async () => {
            await this.certificateEmissionsRepository.update(
                certificateEmission,
            )

            await this.dataSourceRowsRepository.deleteManyByCertificateEmissionId(
                certificateEmission.getId(),
            )

            if (dataSourceRows.length > 0) {
                await this.dataSourceRowsRepository.saveMany(dataSourceRows)
            }
        })

        if (dataSourceStorageFileUrls.length > 0) {
            await Promise.all(
                dataSourceStorageFileUrls.map(url =>
                    this.bucket.deleteObject({
                        bucketName: process.env.CERTIFICATES_BUCKET!,
                        objectName: url,
                    }),
                ),
            )
        }
    }
}
