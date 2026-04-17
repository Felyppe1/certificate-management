import {
    DATA_SOURCE_MIME_TYPE,
    DataSource,
    DATA_SOURCE_MIME_TYPE_TO_FILE_EXTENSION,
} from '../domain/data-source'
import { INPUT_METHOD } from '../domain/certificate'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { IBucket } from './interfaces/cloud/ibucket'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { ISpreadsheetGeneratorFactory } from './interfaces/ispreadsheet-content-extractor-factory'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsReadRepository } from './interfaces/repository/idata-source-rows-read-repository'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
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
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (!certificateEmission.isOwner(input.userId)) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        if (certificateEmission.isEmitted()) {
            throw new ValidationError(VALIDATION_ERROR_TYPE.CERTIFICATE_EMITTED)
        }

        if (!certificateEmission.hasDataSource()) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE)
        }

        const dataSourceMimeType =
            certificateEmission.serialize().dataSource?.fileMimeType

        if (
            !dataSourceMimeType ||
            !DataSource.isImageMimeType(dataSourceMimeType)
        ) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_NOT_IMAGE,
            )
        }

        // Resolve access token if saving to Drive
        let accessToken: string | undefined

        if (input.destination === 'drive') {
            const user = await this.usersRepository.getById(input.userId)
            const externalAccount = user?.getExternalAccount('GOOGLE')

            if (!externalAccount) {
                throw new ForbiddenError(
                    FORBIDDEN_ERROR_TYPE.GOOGLE_ACCOUNT_NOT_FOUND,
                )
            }

            const newData =
                await this.googleAuthGateway.checkOrGetNewAccessToken({
                    accessToken: externalAccount.getAccessToken(),
                    refreshToken: externalAccount.getRefreshToken()!,
                    accessTokenExpiryDateTime:
                        externalAccount.getAccessTokenExpiryDateTime()!,
                })

            if (newData) {
                user!.updateExternalAccount('GOOGLE', {
                    accessToken: newData.newAccessToken,
                    accessTokenExpiryDateTime:
                        newData.newAccessTokenExpiryDateTime,
                })

                await this.usersRepository.update(user!)
            }

            accessToken = externalAccount.getAccessToken()
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
