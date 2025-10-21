import { INPUT_METHOD, Template } from '../domain/template'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { NotFoundError } from '../domain/error/not-found-error'
import { IExternalUserAccountsRepository } from './interfaces/iexternal-user-accounts-repository'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { IBucket } from './interfaces/ibucket'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'
import { DATA_SOURCE_FILE_EXTENSION, DataSource } from '../domain/data-source'
import { ValidationError } from '../domain/error/validation-error'
import { DataSet } from '../domain/data-set'
import { IDataSetsRepository } from './interfaces/idata-sets-repository'

interface AddDataSourceByDrivePickerUseCaseInput {
    certificateId: string
    fileId: string
    sessionToken: string
}

export class AddDataSourceByDrivePickerUseCase {
    constructor(
        private certificateEmissionsRepository: ICertificatesRepository,
        private dataSetsRepository: Pick<IDataSetsRepository, 'upsert'>,
        private sessionsRepository: ISessionsRepository,
        private googleDriveGateway: IGoogleDriveGateway,
        private spreadsheetContentExtractorFactory: ISpreadsheetContentExtractorFactory,
        private externalUserAccountsRepository: IExternalUserAccountsRepository,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        >,
        private bucket: Pick<IBucket, 'deleteObject'>,
    ) {}

    async execute(input: AddDataSourceByDrivePickerUseCaseInput) {
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

        const externalAccount =
            await this.externalUserAccountsRepository.getById(
                session.userId,
                'GOOGLE',
            )

        if (!externalAccount) {
            throw new UnauthorizedError('external-account-not-found')
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
                'File extension not supported for data source',
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
            inputMethod: INPUT_METHOD.URL,
            fileName: name,
            fileExtension: fileExtension as DATA_SOURCE_FILE_EXTENSION,
            columns,
            thumbnailUrl,
        }

        if (certificate.hasDataSource()) {
            certificate.updateDataSource(newDataSourceInput)
        } else {
            certificate.setDataSource(newDataSourceInput)
        }

        await this.certificateEmissionsRepository.update(certificate)

        const newDataSet = DataSet.create({
            dataSourceId: certificate.getDataSourceId()!,
            rows,
        })

        await this.dataSetsRepository.upsert(newDataSet)

        if (dataSourceStorageFileUrl) {
            await this.bucket.deleteObject({
                bucketName: process.env.CERTIFICATES_BUCKET!,
                objectName: dataSourceStorageFileUrl,
            })
        }
    }
}
