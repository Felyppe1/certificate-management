import { DataSource } from '../domain/data-source'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { DataSourceNotFoundError } from '../domain/error/not-found-error/data-source-not-found-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { DataSourceImageRefreshNotAllowedError } from '../domain/error/validation-error/data-source-image-refresh-not-allowed-error'
import { UnexistentDataSourceDriveFileIdError } from '../domain/error/validation-error/unexistent-data-source-drive-file-id-error'
import { UnsupportedDataSourceMimetypeError } from '../domain/error/validation-error/unsupported-data-source-mimetype-error'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { IGoogleAuthGateway } from './interfaces/gateway/igoogle-auth-gateway'
import { IGoogleDriveGateway } from './interfaces/gateway/igoogle-drive-gateway'
import { ISpreadsheetContentExtractorFactory } from './interfaces/extraction/ispreadsheet-content-extractor-factory'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { DataSourceDomainService } from '../domain/domain-service/data-source-domain-service'
import { IDataSourceRowsRepository } from './interfaces/repository/write/idata-source-rows-repository'

interface RefreshDataSourceUseCaseInput {
    userId: string
    certificateId: string
}

export class RefreshDataSourceUseCase {
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
        private readonly googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        >,
        private readonly spreadsheetContentExtractorFactory: Pick<
            ISpreadsheetContentExtractorFactory,
            'create'
        >,
        private readonly usersRepository: Pick<
            IUsersRepository,
            'getById' | 'update'
        >,
        private readonly transactionManager: Pick<ITransactionManager, 'run'>,
    ) {}

    async execute(input: RefreshDataSourceUseCaseInput) {
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

        if (certificateEmission.isEmitted()) {
            throw new CertificateEmittedError()
        }

        if (!certificateEmission.hasDataSource()) {
            throw new DataSourceNotFoundError()
        }

        if (certificateEmission.dataSourceHasImage()) {
            throw new DataSourceImageRefreshNotAllowedError()
        }

        const driveFileId = certificateEmission.getDriveDataSourceFileId()

        if (!driveFileId) {
            throw new UnexistentDataSourceDriveFileIdError()
        }

        const user = await this.usersRepository.getById(
            certificateEmission.getUserId(),
        )

        if (user?.hasExternalAccount('GOOGLE')) {
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
        }

        const authParams = user?.hasExternalAccount('GOOGLE')
            ? {
                  userAccessToken: user?.getGoogleAccessToken() ?? undefined,
                  userRefreshToken: user?.getGoogleRefreshToken() ?? undefined,
              }
            : {}

        const { name, fileMimeType, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: driveFileId,
                ...authParams,
            })

        if (!DataSource.isValidFileMimeType(fileMimeType)) {
            throw new UnsupportedDataSourceMimetypeError()
        }

        if (DataSource.isImageMimeType(fileMimeType)) {
            throw new DataSourceImageRefreshNotAllowedError()
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId,
            fileMimeType,
            ...(user?.hasExternalAccount('GOOGLE') && {
                accessToken: user?.getGoogleAccessToken() ?? undefined,
            }),
        })

        const contentExtractor =
            this.spreadsheetContentExtractorFactory.create(fileMimeType)

        const { rows, columns } = await contentExtractor.extractColumns([
            buffer,
        ])

        const dataSourceDomainService = new DataSourceDomainService()

        const dataSourceRows = dataSourceDomainService.createDataSource({
            certificate: certificateEmission,
            newDataSourceData: {
                files: [
                    {
                        driveFileId,
                        storageFileUrl: null,
                        fileName: name,
                    },
                ],
                fileMimeType,
                inputMethod: certificateEmission.getDataSourceInputMethod()!,
                thumbnailUrl: thumbnailUrl,
                columnsRow: 1,
                dataRowStart: 2,
                columns,
                rows,
                googleAccountEmail: user?.getGoogleEmail() ?? null,
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
    }
}
