import { INPUT_METHOD } from '../domain/certificate'
import { Template } from '../domain/template'
import { IGoogleDriveGateway } from './interfaces/gateway/igoogle-drive-gateway'
import { IFileContentExtractorFactory } from './interfaces/extraction/ifile-content-extractor-factory'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { IGoogleAuthGateway } from './interfaces/gateway/igoogle-auth-gateway'
import { IBucket } from './interfaces/storage/ibucket'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { UnsupportedTemplateMimetypeError } from '../domain/error/validation-error/unsupported-template-mimetype-error'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IDataSourceRowsRepository } from './interfaces/repository/write/idata-source-rows-repository'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { GoogleAccountNotFoundError } from '../domain/error/forbidden-error/google-account-not-found-error'
import { IStringVariableExtractor } from './interfaces/extraction/istring-variable-extractor'
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
            throw new CertificateNotFoundError()
        }

        if (!certificateEmission.isOwner(input.userId)) {
            throw new NotCertificateOwnerError()
        }

        const user = await this.usersRepository.getById(input.userId)

        if (!user?.hasExternalAccount('GOOGLE')) {
            throw new GoogleAccountNotFoundError()
        }

        if (certificateEmission.isEmitted()) {
            throw new CertificateEmittedError()
        }

        const newData = await this.googleAuthGateway.checkOrGetNewAccessToken({
            accessToken: user.getGoogleAccessToken()!,
            refreshToken: user.getGoogleRefreshToken()!,
            accessTokenExpiryDateTime:
                user.getGoogleAccessTokenExpiryDateTime()!,
        })

        if (newData) {
            user.updateExternalAccountTokens('GOOGLE', {
                accessToken: newData.newAccessToken,
                accessTokenExpiryDateTime: newData.newAccessTokenExpiryDateTime,
            })

            await this.usersRepository.update(user)
        }

        const { name, fileMimeType, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: input.fileId,
                userAccessToken: user.getGoogleAccessToken() ?? undefined,
                userRefreshToken: user.getGoogleRefreshToken() ?? undefined,
            })

        if (!Template.isValidFileMimeType(fileMimeType)) {
            throw new UnsupportedTemplateMimetypeError()
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId: input.fileId,
            fileMimeType: fileMimeType,
            accessToken: user.getGoogleAccessToken() ?? undefined,
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
            googleAccountEmail: user.getGoogleEmail()!,
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
