import { DataSet } from '../domain/data-set'
import { INPUT_METHOD } from '../domain/certificate'
import { DataSource } from '../domain/data-source'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { IDataSetsRepository } from './interfaces/idata-sets-repository'
import { IExternalUserAccountsRepository } from './interfaces/iexternal-user-accounts-repository'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'

interface RefreshDataSourceUseCaseInput {
    sessionToken: string
    certificateId: string
}

export class RefreshDataSourceUseCase {
    constructor(
        private certificateEmissionsRepository: ICertificatesRepository,
        private dataSetsRepository: Pick<IDataSetsRepository, 'upsert'>,
        private sessionsRepository: ISessionsRepository,
        private googleDriveGateway: IGoogleDriveGateway,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        >,
        private spreadsheetContentExtractorFactory: ISpreadsheetContentExtractorFactory,
        private externalUserAccountsRepository: IExternalUserAccountsRepository,
    ) {}

    async execute(input: RefreshDataSourceUseCaseInput) {
        const session = await this.sessionsRepository.getById(
            input.sessionToken,
        )

        if (!session) {
            throw new AuthenticationError('session-not-found')
        }

        const certificate = await this.certificateEmissionsRepository.getById(
            input.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificate.getUserId() !== session.userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        if (!certificate.hasDataSource()) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE)
        }

        const driveFileId = certificate.getDriveDataSourceFileId()

        if (!driveFileId) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNEXISTENT_DATA_SOURCE_DRIVE_FILE_ID,
            )
        }

        console.log(certificate.getDataSourceStorageFileUrl())

        const externalAccount =
            await this.externalUserAccountsRepository.getById(
                certificate.getUserId(),
                'GOOGLE',
            )

        if (externalAccount) {
            const newData =
                await this.googleAuthGateway.checkOrGetNewAccessToken({
                    accessToken: externalAccount.accessToken,
                    refreshToken: externalAccount.refreshToken!,
                    accessTokenExpiryDateTime:
                        externalAccount.accessTokenExpiryDateTime!,
                })

            if (newData) {
                externalAccount.accessToken = newData.newAccessToken
                externalAccount.accessTokenExpiryDateTime =
                    newData.newAccessTokenExpiryDateTime

                await this.externalUserAccountsRepository.update(
                    externalAccount,
                )
            }
        }

        // TODO: should it be a domain service?
        const { name, fileExtension, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: driveFileId,
                userAccessToken: externalAccount?.accessToken,
                userRefreshToken: externalAccount?.refreshToken ?? undefined,
            })

        if (!DataSource.isValidFileExtension(fileExtension)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNSUPPORTED_DATA_SOURCE_MIMETYPE,
            )
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId,
            fileExtension: fileExtension,
            accessToken: externalAccount?.accessToken,
        })

        const contentExtractor =
            this.spreadsheetContentExtractorFactory.create(fileExtension)

        const { columns, rows } = contentExtractor.extractColumns(buffer)

        const newDataSourceInput = {
            driveFileId,
            storageFileUrl: null,
            fileExtension: fileExtension,
            inputMethod: INPUT_METHOD.URL,
            fileName: name,
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

        // TODO: needs to be in a transaction
        await this.dataSetsRepository.upsert(newDataSet)
    }
}
