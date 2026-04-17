import { INPUT_METHOD } from '../domain/certificate'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { IBucket } from './interfaces/cloud/ibucket'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'
import {
    DATA_SOURCE_MIME_TYPE,
    DataSource,
    MAX_IMAGE_FILES,
} from '../domain/data-source'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import { DataSourceDomainService } from '../domain/domain-service/data-source-domain-service'
import { env } from '@/env'

interface AddDataSourceByDrivePickerUseCaseInput {
    certificateId: string
    fileIds: string[]
    userId: string
}

export class AddDataSourceByDrivePickerUseCase {
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
        private usersRepository: Pick<IUsersRepository, 'getById' | 'update'>,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        >,
        private bucket: Pick<IBucket, 'deleteObject'>,
        private transactionManager: Pick<ITransactionManager, 'run'>,
    ) {}

    async execute(input: AddDataSourceByDrivePickerUseCaseInput) {
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

        const user = await this.usersRepository.getById(input.userId)
        const externalAccount = user?.getExternalAccount('GOOGLE')

        if (!externalAccount) {
            throw new ForbiddenError(
                FORBIDDEN_ERROR_TYPE.GOOGLE_ACCOUNT_NOT_FOUND,
            )
        }

        if (certificateEmission.isEmitted()) {
            throw new ValidationError(VALIDATION_ERROR_TYPE.CERTIFICATE_EMITTED)
        }

        const newData = await this.googleAuthGateway.checkOrGetNewAccessToken({
            accessToken: externalAccount.getAccessToken(),
            refreshToken: externalAccount.getRefreshToken()!,
            accessTokenExpiryDateTime:
                externalAccount.getAccessTokenExpiryDateTime()!,
        })

        if (newData) {
            user!.updateExternalAccount('GOOGLE', {
                accessToken: newData.newAccessToken,
                accessTokenExpiryDateTime: newData.newAccessTokenExpiryDateTime,
            })

            await this.usersRepository.update(user!)
        }

        const filesMetadata = await Promise.all(
            input.fileIds.map(fileId =>
                this.googleDriveGateway.getFileMetadata({
                    fileId,
                    userAccessToken: externalAccount.getAccessToken(),
                    userRefreshToken:
                        externalAccount.getRefreshToken() || undefined,
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
            if (filesMetadata.length > MAX_IMAGE_FILES) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.DATA_SOURCE_IMAGE_FILES_EXCEEDED,
                )
            }

            const allFilesAreImages = filesMetadata.every(file =>
                DataSource.isImageMimeType(file.fileMimeType),
            )

            if (!allFilesAreImages) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.DATA_SOURCE_ALL_FILES_NOT_IMAGES,
                )
            }
        } else {
            if (filesMetadata.length !== 1) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.DATA_SOURCE_ALL_FILES_NOT_IMAGES,
                )
            }
        }

        const buffers = await Promise.all(
            input.fileIds.map((fileId, index) =>
                this.googleDriveGateway.downloadFile({
                    driveFileId: fileId,
                    fileMimeType: filesMetadata[index].fileMimeType,
                    accessToken: externalAccount.getAccessToken(),
                }),
            ),
        )

        const contentExtractor =
            this.spreadsheetContentExtractorFactory.create(fileMimeType)

        const { rows, columns } = await contentExtractor.extractColumns(buffers)

        const dataSourceStorageFileUrls =
            certificateEmission.getDataSourceStorageFileUrls()

        const dataSourceDomainService = new DataSourceDomainService()

        const dataSourceRows = dataSourceDomainService.createDataSource({
            certificate: certificateEmission,
            newDataSourceData: {
                files: input.fileIds.map((fileId, index) => ({
                    driveFileId: fileId,
                    storageFileUrl: null,
                    fileName: filesMetadata[index].name,
                })),
                inputMethod: INPUT_METHOD.GOOGLE_DRIVE,
                fileMimeType,
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

        await Promise.all(
            dataSourceStorageFileUrls.map(url =>
                this.bucket.deleteObject({
                    bucketName: env.CERTIFICATES_BUCKET,
                    objectName: url,
                }),
            ),
        )
    }
}
