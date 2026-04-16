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
import {
    TEMPLATE_MIME_TYPE_TO_FILE_EXTENSION,
    Template,
} from '../domain/template'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { IFileContentExtractorFactory } from './interfaces/ifile-content-extractor-factory'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { IBucket } from './interfaces/cloud/ibucket'
import { IStringVariableExtractor } from './interfaces/istring-variable-extractor'

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
        const externalAccount = user?.getExternalAccount('GOOGLE')

        if (
            certificateEmission.isTemplateFromGoogleDrive() ||
            certificateEmission.isTemplateFromUrl()
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

        // TODO: should it be a domain service?
        const { name, fileMimeType, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: driveFileId,
                ...((certificateEmission.isTemplateFromGoogleDrive() ||
                    certificateEmission.isTemplateFromUrl()) && {
                    userAccessToken: externalAccount?.getAccessToken(),
                    userRefreshToken:
                        externalAccount?.getRefreshToken() ?? undefined,
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
            ...((certificateEmission.isTemplateFromGoogleDrive() ||
                certificateEmission.isTemplateFromUrl()) && {
                accessToken: externalAccount?.getAccessToken(),
            }),
        })

        const contentExtractor =
            this.fileContentExtractorFactory.create(fileMimeType)

        const content = await contentExtractor.extractText(buffer)

        const uniqueVariables =
            this.stringVariableExtractor.extractVariables(content)

        const path = `users/${input.userId}/certificates/${certificateEmission.getId()}/template.${TEMPLATE_MIME_TYPE_TO_FILE_EXTENSION[fileMimeType]}`

        const newTemplateInput = {
            driveFileId,
            storageFileUrl: path,
            fileMimeType: fileMimeType,
            inputMethod: certificateEmission.getTemplateInputMethod()!,
            fileName: name,
            variables: uniqueVariables,
            thumbnailUrl,
        }

        certificateEmission.setTemplate(newTemplateInput)

        await this.bucket.uploadObject({
            buffer,
            bucketName: process.env.CERTIFICATES_BUCKET!,
            objectName: path,
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
