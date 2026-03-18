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
import { IExternalUserAccountsRepository } from './interfaces/repository/iexternal-user-accounts-repository'
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
        private certificateEmissionsRepository: ICertificatesRepository,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'resetProcessingStatusByCertificateEmissionId'
        >,
        private googleDriveGateway: IGoogleDriveGateway,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        >,
        private fileContentExtractorFactory: IFileContentExtractorFactory,
        private externalUserAccountsRepository: IExternalUserAccountsRepository,
        private transactionManager: ITransactionManager,
        private bucket: Pick<IBucket, 'uploadObject'>,
        private stringVariableExtractor: Pick<
            IStringVariableExtractor,
            'extractVariables'
        >,
    ) {}

    async execute(input: RefreshTemplateUseCaseInput) {
        const certificate = await this.certificateEmissionsRepository.getById(
            input.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificate.getUserId() !== input.userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        if (!certificate.hasTemplate()) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.TEMPLATE)
        }

        const driveFileId = certificate.getDriveTemplateFileId()

        if (!driveFileId) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNEXISTENT_TEMPLATE_DRIVE_FILE_ID,
            )
        }

        const externalAccount =
            await this.externalUserAccountsRepository.getById(
                certificate.getUserId(),
                'GOOGLE',
            )

        if (
            certificate.isTemplateFromGoogleDrive() ||
            certificate.isTemplateFromUrl()
        ) {
            if (!externalAccount) {
                throw new ForbiddenError(
                    FORBIDDEN_ERROR_TYPE.GOOGLE_ACCOUNT_NOT_FOUND,
                )
            }

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
        const { name, fileMimeType, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: driveFileId,
                ...((certificate.isTemplateFromGoogleDrive() ||
                    certificate.isTemplateFromUrl()) && {
                    userAccessToken: externalAccount?.accessToken,
                    userRefreshToken:
                        externalAccount?.refreshToken ?? undefined,
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
            ...((certificate.isTemplateFromGoogleDrive() ||
                certificate.isTemplateFromUrl()) && {
                accessToken: externalAccount?.accessToken,
            }),
        })

        const contentExtractor =
            this.fileContentExtractorFactory.create(fileMimeType)

        const content = await contentExtractor.extractText(buffer)

        const uniqueVariables =
            this.stringVariableExtractor.extractVariables(content)

        const path = `users/${input.userId}/certificates/${certificate.getId()}/template.${TEMPLATE_MIME_TYPE_TO_FILE_EXTENSION[fileMimeType]}`

        const newTemplateInput = {
            driveFileId,
            storageFileUrl: path,
            fileMimeType: fileMimeType,
            inputMethod: certificate.getTemplateInputMethod()!,
            fileName: name,
            variables: uniqueVariables,
            thumbnailUrl,
        }

        certificate.setTemplate(newTemplateInput)

        await this.bucket.uploadObject({
            buffer,
            bucketName: process.env.CERTIFICATES_BUCKET!,
            objectName: path,
            mimeType: fileMimeType,
        })

        await this.transactionManager.run(async () => {
            if (certificate.hasDataSource()) {
                await this.dataSourceRowsRepository.resetProcessingStatusByCertificateEmissionId(
                    certificate.getId(),
                )
            }

            await this.certificateEmissionsRepository.update(certificate)
        })
    }
}
