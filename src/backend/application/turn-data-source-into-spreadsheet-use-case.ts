import {
    DATA_SOURCE_MIME_TYPE,
    DataSource,
    DATA_SOURCE_MIME_TYPE_TO_FILE_EXTENSION,
} from '../domain/data-source'
import { INPUT_METHOD } from '../domain/certificate'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { GoogleAccountNotFoundError } from '../domain/error/forbidden-error/google-account-not-found-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { DataSourceNotFoundError } from '../domain/error/not-found-error/data-source-not-found-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { DataSourceNotImageError } from '../domain/error/validation-error/data-source-not-image-error'
import { IBucket } from './interfaces/storage/ibucket'
import { IGoogleAuthGateway } from './interfaces/gateway/igoogle-auth-gateway'
import { IGoogleDriveGateway } from './interfaces/gateway/igoogle-drive-gateway'
import { ISpreadsheetGeneratorFactory } from './interfaces/extraction/ispreadsheet-content-extractor-factory'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { IDataSourceRowsReadRepository } from './interfaces/repository/read/idata-source-rows-read-repository'
import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { env } from '@/env'

export type SpreadsheetFormat = 'csv' | 'xlsx'
export type SpreadsheetDestination = 'local' | 'drive'

interface TurnDataSourceIntoSpreadsheetUseCaseInput {
    certificateId: string
    userId: string
    format: SpreadsheetFormat
    destination: SpreadsheetDestination
}

export class TurnDataSourceIntoSpreadsheetUseCase {
    constructor(
        private certificatesRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private dataSourceRowsReadRepository: Pick<
            IDataSourceRowsReadRepository,
            'getAllRawByCertificateEmissionId'
        >,
        private bucket: Pick<IBucket, 'uploadObject' | 'deleteObject'>,
        private spreadsheetGeneratorFactory: Pick<
            ISpreadsheetGeneratorFactory,
            'create'
        >,
        private googleDriveGateway: Pick<IGoogleDriveGateway, 'uploadFile'>,
        private usersRepository: Pick<IUsersRepository, 'getById' | 'update'>,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        >,
    ) {}

    async execute(
        input: TurnDataSourceIntoSpreadsheetUseCaseInput,
    ): Promise<void> {
        const certificateEmission = await this.certificatesRepository.getById(
            input.certificateId,
        )

        if (!certificateEmission) {
            throw new CertificateNotFoundError()
        }

        if (!certificateEmission.isOwner(input.userId)) {
            throw new NotCertificateOwnerError()
        }

        if (certificateEmission.isEmitted()) {
            throw new CertificateEmittedError()
        }

        if (!certificateEmission.hasDataSource()) {
            throw new DataSourceNotFoundError()
        }

        const dataSourceMimeType =
            certificateEmission.serialize().dataSource?.fileMimeType

        if (
            !dataSourceMimeType ||
            !DataSource.isImageMimeType(dataSourceMimeType)
        ) {
            throw new DataSourceNotImageError()
        }

        // Resolve access token if saving to Drive
        let accessToken: string | undefined

        if (input.destination === 'drive') {
            const user = await this.usersRepository.getById(input.userId)

            if (!user?.hasExternalAccount('GOOGLE')) {
                throw new GoogleAccountNotFoundError()
            }

            const newData =
                await this.googleAuthGateway.checkOrGetNewAccessToken({
                    accessToken: user.getGoogleAccessToken()!,
                    refreshToken: user.getGoogleRefreshToken()!,
                    accessTokenExpiryDateTime:
                        user.getGoogleAccessTokenExpiryDateTime()!,
                })

            if (newData) {
                user.updateExternalAccountTokens('GOOGLE', {
                    accessToken: newData.newAccessToken,
                    accessTokenExpiryDateTime:
                        newData.newAccessTokenExpiryDateTime,
                })

                await this.usersRepository.update(user)
            }

            accessToken = user.getGoogleAccessToken() ?? undefined
        }

        // Determine output mime type and generate buffer via DI

        const columnNames = certificateEmission
            .getDataSourceColumns()
            .map(c => c.name)

        const rows =
            await this.dataSourceRowsReadRepository.getAllRawByCertificateEmissionId(
                input.certificateId,
            )

        const newMimeType =
            input.format === 'xlsx'
                ? DATA_SOURCE_MIME_TYPE.XLSX
                : DATA_SOURCE_MIME_TYPE.CSV

        const generator = this.spreadsheetGeneratorFactory.create(newMimeType)

        const buffer = await generator.generate(
            columnNames,
            rows.map(r => r.data),
        )

        // Filenames
        const certificateName = certificateEmission.getName()
        const fileExtension =
            DATA_SOURCE_MIME_TYPE_TO_FILE_EXTENSION[newMimeType]
        const displayFileName = `${certificateName} - Fonte de Dados.${fileExtension}`

        // Collect old image URLs before modifying the entity
        const oldImageUrls = certificateEmission.getDataSourceStorageFileUrls()

        if (input.destination === 'local') {
            const filePath = `users/${input.userId}/certificates/${input.certificateId}/data-source.${fileExtension}`

            await this.bucket.uploadObject({
                buffer,
                bucketName: env.CERTIFICATES_BUCKET,
                objectName: filePath,
                mimeType: newMimeType,
            })

            certificateEmission.replaceDataSourceWithSpreadsheet(
                {
                    fileName: displayFileName,
                    driveFileId: null,
                    storageFileUrl: filePath,
                },
                newMimeType,
                INPUT_METHOD.UPLOAD,
            )
        } else {
            const { fileId } = await this.googleDriveGateway.uploadFile({
                buffer,
                mimeType: newMimeType,
                fileName: displayFileName,
                accessToken: accessToken!,
            })

            certificateEmission.replaceDataSourceWithSpreadsheet(
                {
                    fileName: displayFileName,
                    driveFileId: fileId,
                    storageFileUrl: null,
                },
                newMimeType,
                INPUT_METHOD.GOOGLE_DRIVE,
            )
        }

        await this.certificatesRepository.update(certificateEmission)

        await Promise.all(
            oldImageUrls.map(url =>
                this.bucket.deleteObject({
                    bucketName: env.CERTIFICATES_BUCKET,
                    objectName: url,
                }),
            ),
        )
    }
}
