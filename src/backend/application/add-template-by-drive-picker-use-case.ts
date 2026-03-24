import { INPUT_METHOD } from '../domain/certificate'
import {
    TEMPLATE_MIME_TYPE_TO_FILE_EXTENSION,
    Template,
} from '../domain/template'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { IFileContentExtractorFactory } from './interfaces/ifile-content-extractor-factory'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { IExternalUserAccountsRepository } from './interfaces/repository/iexternal-user-accounts-repository'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { IBucket } from './interfaces/cloud/ibucket'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import { IStringVariableExtractor } from './interfaces/istring-variable-extractor'

interface AddTemplateByDrivePickerUseCaseInput {
    certificateId: string
    fileId: string
    userId: string
}

export class AddTemplateByDrivePickerUseCase {
    constructor(
        private certificateEmissionsRepository: ICertificatesRepository,
        private googleDriveGateway: IGoogleDriveGateway,
        private fileContentExtractorFactory: IFileContentExtractorFactory,
        private externalUserAccountsRepository: IExternalUserAccountsRepository,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'resetProcessingStatusByCertificateEmissionId'
        >,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        >,
        private bucket: Pick<IBucket, 'uploadObject'>,
        private transactionManager: ITransactionManager,
        private stringVariableExtractor: Pick<
            IStringVariableExtractor,
            'extractVariables'
        >,
    ) {}

    async execute(input: AddTemplateByDrivePickerUseCaseInput) {
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

        if (certificate.isEmitted()) {
            throw new ValidationError(VALIDATION_ERROR_TYPE.CERTIFICATE_EMITTED)
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

        const { name, fileMimeType, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: input.fileId,
                userAccessToken: externalAccount.accessToken,
                userRefreshToken: externalAccount.refreshToken || undefined,
            })

        if (!Template.isValidFileMimeType(fileMimeType)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNSUPPORTED_TEMPLATE_MIMETYPE,
            )
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId: input.fileId,
            fileMimeType: fileMimeType,
            accessToken: externalAccount.accessToken,
        })

        const contentExtractor =
            this.fileContentExtractorFactory.create(fileMimeType)

        const content = await contentExtractor.extractText(buffer)

        const uniqueVariables =
            this.stringVariableExtractor.extractVariables(content)

        const path = `users/${input.userId}/certificates/${certificate.getId()}/template.${TEMPLATE_MIME_TYPE_TO_FILE_EXTENSION[fileMimeType]}`

        const newTemplateInput = {
            driveFileId: input.fileId,
            storageFileUrl: path,
            inputMethod: INPUT_METHOD.GOOGLE_DRIVE,
            fileName: name,
            variables: uniqueVariables,
            fileMimeType,
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
