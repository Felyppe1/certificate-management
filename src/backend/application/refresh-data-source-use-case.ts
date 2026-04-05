import { DATA_SOURCE_MIME_TYPE, DataSource } from '../domain/data-source'
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
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { DataSourceDomainService } from '../domain/domain-service/data-source-domain-service'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'

interface RefreshDataSourceUseCaseInput {
    userId: string
    certificateId: string
}

export class RefreshDataSourceUseCase {
    constructor(
        private certificateEmissionsRepository: ICertificatesRepository,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'saveMany' | 'deleteManyByCertificateEmissionId'
        >,
        private googleDriveGateway: IGoogleDriveGateway,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        >,
        private spreadsheetContentExtractorFactory: ISpreadsheetContentExtractorFactory,
        private usersRepository: Pick<IUsersRepository, 'getById' | 'update'>,
        private transactionManager: ITransactionManager,
    ) {}

    async execute(input: RefreshDataSourceUseCaseInput) {
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

        if (!certificateEmission.hasDataSource()) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE)
        }

        if (certificateEmission.dataSourceHasImage()) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_IMAGE_REFRESH_NOT_ALLOWED,
            )
        }

        const driveFileId = certificateEmission.getDriveDataSourceFileId()

        if (!driveFileId) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNEXISTENT_DATA_SOURCE_DRIVE_FILE_ID,
            )
        }

        const user = await this.usersRepository.getById(
            certificateEmission.getUserId(),
        )
        const externalAccount = user?.getExternalAccount('GOOGLE')

        if (
            certificateEmission.isDataSourceFromGoogleDrive() ||
            certificateEmission.isDataSourceFromUrl()
        ) {
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
        }

        const authParams =
            certificateEmission.isDataSourceFromGoogleDrive() ||
            certificateEmission.isDataSourceFromUrl()
                ? {
                      userAccessToken: externalAccount?.getAccessToken(),
                      userRefreshToken:
                          externalAccount?.getRefreshToken() ?? undefined,
                  }
                : {}

        const { name, fileMimeType, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: driveFileId,
                ...authParams,
            })

        if (!DataSource.isValidFileMimeType(fileMimeType)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNSUPPORTED_DATA_SOURCE_MIMETYPE,
            )
        }

        if (DataSource.isImageMimeType(fileMimeType)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_IMAGE_REFRESH_NOT_ALLOWED,
            )
        }

        const accessTokenParam =
            certificateEmission.isDataSourceFromGoogleDrive() ||
            certificateEmission.isDataSourceFromUrl()
                ? { accessToken: externalAccount?.getAccessToken() }
                : {}

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId,
            fileMimeType,
            ...accessTokenParam,
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
