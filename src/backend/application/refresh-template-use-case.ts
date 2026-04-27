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
import { INPUT_METHOD } from '../domain/certificate'
import { Template } from '../domain/template'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { IFileContentExtractorFactory } from './interfaces/ifile-content-extractor-factory'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { IBucket } from './interfaces/cloud/ibucket'
import { IStringVariableExtractor } from './interfaces/istring-variable-extractor'
import { env } from '@/env'

interface RefreshTemplateUseCaseInput {
    userId: string
    certificateId: string
}

export class RefreshTemplateUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'resetProcessingStatusByCertificateEmissionId'
        >,
        private googleDriveGateway: Pick<
            IGoogleDriveGateway,
            'getFileMetadata' | 'downloadFile'
        >,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        >,
        private fileContentExtractorFactory: Pick<
            IFileContentExtractorFactory,
            'create'
        >,
        private usersRepository: Pick<IUsersRepository, 'getById' | 'update'>,
        private transactionManager: Pick<ITransactionManager, 'run'>,
        private bucket: Pick<IBucket, 'uploadObject'>,
        private stringVariableExtractor: Pick<
            IStringVariableExtractor,
            'extractVariables'
        >,
    ) {}

    async execute(input: RefreshTemplateUseCaseInput) {
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

        if (!certificateEmission.hasTemplate()) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.TEMPLATE)
        }

        const driveFileId = certificateEmission.getDriveTemplateFileId()

        if (!driveFileId) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNEXISTENT_TEMPLATE_DRIVE_FILE_ID,
            )
        }

        const user = await this.usersRepository.getById(
            certificateEmission.getUserId(),
        )
        if (user?.hasGoogleAccount()) {
            const newData =
                await this.googleAuthGateway.checkOrGetNewAccessToken({
                    accessToken: user.getGoogleAccessToken()!,
                    refreshToken: user.getGoogleRefreshToken()!,
                    accessTokenExpiryDateTime:
                        user.getGoogleAccessTokenExpiryDateTime()!,
                })

            if (newData) {
                user.updateExternalAccount('GOOGLE', {
                    accessToken: newData.newAccessToken,
                    accessTokenExpiryDateTime:
                        newData.newAccessTokenExpiryDateTime,
                })

                await this.usersRepository.update(user)
            }
        }

        // TODO: should it be a domain service?
        const { name, fileMimeType, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: driveFileId,
                ...(user?.hasGoogleAccount() && {
                    userAccessToken: user?.getGoogleAccessToken() ?? undefined,
                    userRefreshToken:
                        user?.getGoogleRefreshToken() ?? undefined,
                }),
            })

        if (!Template.isValidFileMimeType(fileMimeType)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNSUPPORTED_TEMPLATE_MIMETYPE,
            )
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId,
            fileMimeType: fileMimeType,
            ...(user?.hasGoogleAccount() && {
                accessToken: user?.getGoogleAccessToken() ?? undefined,
            }),
        })

        const contentExtractor =
            this.fileContentExtractorFactory.create(fileMimeType)

        const content = await contentExtractor.extractText(buffer)

        const uniqueVariables =
            this.stringVariableExtractor.extractVariables(content)

        const newTemplateInput = {
            driveFileId,
            fileMimeType: fileMimeType,
            inputMethod: certificateEmission.getTemplateInputMethod()!,
            fileName: name,
            variables: uniqueVariables,
            thumbnailUrl,
            googleAccountEmail: user?.getGoogleEmail() ?? null,
        }

        certificateEmission.setTemplate(newTemplateInput)

        await this.bucket.uploadObject({
            buffer,
            bucketName: env.CERTIFICATES_BUCKET,
            objectName: certificateEmission.getTemplateStorageFileUrl(),
            mimeType: fileMimeType,
        })

        await this.transactionManager.run(async () => {
            if (certificateEmission.hasDataSource()) {
                await this.dataSourceRowsRepository.resetProcessingStatusByCertificateEmissionId(
                    certificateEmission.getId(),
                )
            }

            await this.certificateEmissionsRepository.update(
                certificateEmission,
            )
        })
    }
}
