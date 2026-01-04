import { INPUT_METHOD } from '../domain/certificate'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { IExternalUserAccountsRepository } from './interfaces/repository/iexternal-user-accounts-repository'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { IBucket } from './interfaces/cloud/ibucket'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'
import { DATA_SOURCE_FILE_EXTENSION, DataSource } from '../domain/data-source'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { DataSet } from '../domain/data-set'
import { IDataSetsRepository } from './interfaces/repository/idata-sets-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'

interface AddDataSourceByDrivePickerUseCaseInput {
    certificateId: string
    fileId: string
    userId: string
}

export class AddDataSourceByDrivePickerUseCase {
    constructor(
        private certificateEmissionsRepository: ICertificatesRepository,
        private dataSetsRepository: Pick<IDataSetsRepository, 'upsert'>,
        private googleDriveGateway: IGoogleDriveGateway,
        private spreadsheetContentExtractorFactory: ISpreadsheetContentExtractorFactory,
        private externalUserAccountsRepository: IExternalUserAccountsRepository,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        >,
        private bucket: Pick<IBucket, 'deleteObject'>,
        private transactionManager: ITransactionManager,
    ) {}

    async execute(input: AddDataSourceByDrivePickerUseCaseInput) {
        const certificate = await this.certificateEmissionsRepository.getById(
            input.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        const externalAccount =
            await this.externalUserAccountsRepository.getById(
                input.userId,
                'GOOGLE',
            )

        if (!externalAccount) {
            throw new ForbiddenError(
                FORBIDDEN_ERROR_TYPE.GOOGLE_ACCOUNT_NOT_FOUND,
            )
        }

        const newData = await this.googleAuthGateway.checkOrGetNewAccessToken({
            accessToken: externalAccount.accessToken,
            refreshToken: externalAccount.refreshToken!,
            accessTokenExpiryDateTime:
                externalAccount.accessTokenExpiryDateTime!,
        })

        if (newData) {
            externalAccount.accessToken = newData.newAccessToken
            externalAccount.accessTokenExpiryDateTime =
                newData.newAccessTokenExpiryDateTime

            await this.externalUserAccountsRepository.update(externalAccount)
        }

        const { name, fileExtension, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: input.fileId,
                userAccessToken: externalAccount.accessToken,
                userRefreshToken: externalAccount.refreshToken || undefined,
            })

        if (!DataSource.isValidFileExtension(fileExtension)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNSUPPORTED_DATA_SOURCE_MIMETYPE,
            )
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId: input.fileId,
            fileExtension: fileExtension,
            accessToken: externalAccount.accessToken,
        })

        const contentExtractor =
            this.spreadsheetContentExtractorFactory.create(fileExtension)

        const { columns, rows } = contentExtractor.extractColumns(buffer)

        const dataSourceStorageFileUrl =
            certificate.getDataSourceStorageFileUrl()

        const newDataSourceInput = {
            driveFileId: input.fileId,
            storageFileUrl: null,
            inputMethod: INPUT_METHOD.GOOGLE_DRIVE,
            fileName: name,
            fileExtension: fileExtension as DATA_SOURCE_FILE_EXTENSION,
            columns,
            thumbnailUrl,
        }

        certificate.setDataSource(newDataSourceInput)

        const newDataSet = DataSet.create({
            certificateEmissionId: certificate.getId()!,
            rows,
        })

        await this.transactionManager.run(async () => {
            await this.certificateEmissionsRepository.update(certificate)

            await this.dataSetsRepository.upsert(newDataSet)
        })

        if (dataSourceStorageFileUrl) {
            await this.bucket.deleteObject({
                bucketName: process.env.CERTIFICATES_BUCKET!,
                objectName: dataSourceStorageFileUrl,
            })
        }
    }
}
