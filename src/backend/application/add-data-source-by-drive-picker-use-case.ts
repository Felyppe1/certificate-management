import { INPUT_METHOD } from '../domain/certificate'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { IBucket } from './interfaces/cloud/ibucket'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'
import {
    DATA_SOURCE_MIME_TYPE,
    DataSource,
    MAX_IMAGE_FILES,
} from '../domain/data-source'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { UnsupportedDataSourceMimetypeError } from '../domain/error/validation-error/unsupported-data-source-mimetype-error'
import { DataSourceImageFilesExceededError } from '../domain/error/validation-error/data-source-image-files-exceeded-error'
import { DataSourceAllFilesNotImagesError } from '../domain/error/validation-error/data-source-all-files-not-images-error'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { GoogleAccountNotFoundError } from '../domain/error/forbidden-error/google-account-not-found-error'
import { DataSourceDomainService } from '../domain/domain-service/data-source-domain-service'
import { env } from '@/env'

interface AddDataSourceByDrivePickerUseCaseInput {
    certificateId: string
    fileIds: string[]
    userId: string
}

export class AddDataSourceByDrivePickerUseCase {
    constructor(
        private readonly certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private readonly dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'saveMany' | 'deleteManyByCertificateEmissionId'
        >,
        private readonly googleDriveGateway: Pick<
            IGoogleDriveGateway,
            'getFileMetadata' | 'downloadFile'
        >,
        private readonly spreadsheetContentExtractorFactory: Pick<
            ISpreadsheetContentExtractorFactory,
            'create'
        >,
        private readonly usersRepository: Pick<
            IUsersRepository,
            'getById' | 'update'
        >,
        private readonly googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        >,
        private readonly bucket: Pick<IBucket, 'deleteObject'>,
        private readonly transactionManager: Pick<ITransactionManager, 'run'>,
    ) {}

    async execute(input: AddDataSourceByDrivePickerUseCaseInput) {
        const certificateEmission =
            await this.certificateEmissionsRepository.getById(
                input.certificateId,
            )

        if (!certificateEmission) {
            throw new CertificateNotFoundError()
        }

        if (!certificateEmission.isOwner(input.userId)) {
            throw new NotCertificateOwnerError()
        }

        const user = await this.usersRepository.getById(input.userId)

        if (!user?.hasExternalAccount('GOOGLE')) {
            throw new GoogleAccountNotFoundError()
        }

        if (certificateEmission.isEmitted()) {
            throw new CertificateEmittedError()
        }

        const newData = await this.googleAuthGateway.checkOrGetNewAccessToken({
            accessToken: user.getGoogleAccessToken()!,
            refreshToken: user.getGoogleRefreshToken()!,
            accessTokenExpiryDateTime:
                user.getGoogleAccessTokenExpiryDateTime()!,
        })

        if (newData) {
            user.updateExternalAccountTokens('GOOGLE', {
                accessToken: newData.newAccessToken,
                accessTokenExpiryDateTime: newData.newAccessTokenExpiryDateTime,
            })

            await this.usersRepository.update(user)
        }

        const filesMetadata = await Promise.all(
            input.fileIds.map(fileId =>
                this.googleDriveGateway.getFileMetadata({
                    fileId,
                    userAccessToken: user.getGoogleAccessToken() ?? undefined,
                    userRefreshToken: user.getGoogleRefreshToken() ?? undefined,
                }),
            ),
        )

        for (const metadata of filesMetadata) {
            if (!DataSource.isValidFileMimeType(metadata.fileMimeType)) {
                throw new UnsupportedDataSourceMimetypeError()
            }
        }

        const fileMimeType = filesMetadata[0]
            .fileMimeType as DATA_SOURCE_MIME_TYPE

        const isImage = DataSource.isImageMimeType(fileMimeType)

        if (isImage) {
            if (filesMetadata.length > MAX_IMAGE_FILES) {
                throw new DataSourceImageFilesExceededError()
            }

            const allFilesAreImages = filesMetadata.every(file =>
                DataSource.isImageMimeType(file.fileMimeType),
            )

            if (!allFilesAreImages) {
                throw new DataSourceAllFilesNotImagesError()
            }
        } else if (filesMetadata.length !== 1) {
            throw new DataSourceAllFilesNotImagesError()
        }

        const buffers = await Promise.all(
            input.fileIds.map((fileId, index) =>
                this.googleDriveGateway.downloadFile({
                    driveFileId: fileId,
                    fileMimeType: filesMetadata[index].fileMimeType,
                    accessToken: user.getGoogleAccessToken() ?? undefined,
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
                googleAccountEmail: user.getGoogleEmail()!,
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
