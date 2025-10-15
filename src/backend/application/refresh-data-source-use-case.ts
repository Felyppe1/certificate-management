import { DataSource, INPUT_METHOD } from '../domain/data-source'
import { ForbiddenError } from '../domain/error/forbidden-error'
import { NotFoundError } from '../domain/error/not-found-error'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { ValidationError } from '../domain/error/validation-error'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
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
            throw new UnauthorizedError('session-not-found')
        }

        const certificate = await this.certificateEmissionsRepository.getById(
            input.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError('Certificate not found')
        }

        if (certificate.getUserId() !== session.userId) {
            throw new ForbiddenError(
                'You do not have permission to update this certificate',
            )
        }

        if (!certificate.hasDataSource()) {
            throw new ValidationError(
                'Certificate does not have a data source to refresh',
            )
        }

        const driveFileId = certificate.getDriveDataSourceFileId()

        if (!driveFileId) {
            throw new ValidationError(
                'Data source does not have a drive file ID',
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
                'File extension not supported for data source',
            )
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId,
            fileExtension: fileExtension,
            accessToken: externalAccount?.accessToken,
        })

        const contentExtractor =
            this.spreadsheetContentExtractorFactory.create(fileExtension)

        const columns = await contentExtractor.extractColumns(buffer)

        const newDataSourceInput = {
            driveFileId,
            storageFileUrl: null,
            fileExtension: fileExtension,
            inputMethod: INPUT_METHOD.URL,
            fileName: name,
            columns,
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
    }
}
