import { INPUT_METHOD } from '../domain/certificate'
import { Template } from '../domain/template'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { IFileContentExtractorFactory } from './interfaces/ifile-content-extractor-factory'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
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
import { env } from '@/env'

interface AddTemplateByDrivePickerUseCaseInput {
    certificateId: string
    fileId: string
    userId: string
}

export class AddTemplateByDrivePickerUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private googleDriveGateway: Pick<
            IGoogleDriveGateway,
            'getFileMetadata' | 'downloadFile'
        >,
        private fileContentExtractorFactory: Pick<
            IFileContentExtractorFactory,
            'create'
        >,
        private usersRepository: Pick<IUsersRepository, 'getById' | 'update'>,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'resetProcessingStatusByCertificateEmissionId'
        >,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        >,
        private bucket: Pick<IBucket, 'uploadObject'>,
        private transactionManager: Pick<ITransactionManager, 'run'>,
        private stringVariableExtractor: Pick<
            IStringVariableExtractor,
            'extractVariables'
        >,
    ) {}

    async execute(input: AddTemplateByDrivePickerUseCaseInput) {
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

        const user = await this.usersRepository.getById(input.userId)
        const externalAccount = user?.getExternalAccount('GOOGLE')

        if (!externalAccount) {
            throw new ForbiddenError(
                FORBIDDEN_ERROR_TYPE.GOOGLE_ACCOUNT_NOT_FOUND,
            )
        }

        if (certificateEmission.isEmitted()) {
            throw new ValidationError(VALIDATION_ERROR_TYPE.CERTIFICATE_EMITTED)
        }

        const newData = await this.googleAuthGateway.checkOrGetNewAccessToken({
            accessToken: externalAccount.getAccessToken(),
            refreshToken: externalAccount.getRefreshToken()!,
            accessTokenExpiryDateTime:
                externalAccount.getAccessTokenExpiryDateTime()!,
        })

        if (newData) {
            user!.updateExternalAccount('GOOGLE', {
                accessToken: newData.newAccessToken,
                accessTokenExpiryDateTime: newData.newAccessTokenExpiryDateTime,
            })

            await this.usersRepository.update(user!)
        }

        const { name, fileMimeType, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: input.fileId,
                userAccessToken: externalAccount.getAccessToken(),
                userRefreshToken:
                    externalAccount.getRefreshToken() || undefined,
            })

        if (!Template.isValidFileMimeType(fileMimeType)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNSUPPORTED_TEMPLATE_MIMETYPE,
            )
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId: input.fileId,
            fileMimeType: fileMimeType,
            accessToken: externalAccount.getAccessToken(),
        })

        const contentExtractor =
            this.fileContentExtractorFactory.create(fileMimeType)

        const content = await contentExtractor.extractText(buffer)

        const uniqueVariables =
            this.stringVariableExtractor.extractVariables(content)

        const newTemplateInput = {
            driveFileId: input.fileId,
            inputMethod: INPUT_METHOD.GOOGLE_DRIVE,
            fileName: name,
            variables: uniqueVariables,
            fileMimeType,
            thumbnailUrl,
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
