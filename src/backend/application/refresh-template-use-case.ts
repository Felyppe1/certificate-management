import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { TemplateNotFoundError } from '../domain/error/not-found-error/template-not-found-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { UnexistentTemplateDriveFileIdError } from '../domain/error/validation-error/unexistent-template-drive-file-id-error'
import { UnsupportedTemplateMimetypeError } from '../domain/error/validation-error/unsupported-template-mimetype-error'
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
            throw new CertificateNotFoundError()
        }

        if (!certificateEmission.isOwner(input.userId)) {
            throw new NotCertificateOwnerError()
        }

        if (certificateEmission.isEmitted()) {
            throw new CertificateEmittedError()
        }

        if (!certificateEmission.hasTemplate()) {
            throw new TemplateNotFoundError()
        }

        const driveFileId = certificateEmission.getDriveTemplateFileId()

        if (!driveFileId) {
            throw new UnexistentTemplateDriveFileIdError()
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

        // TODO: should it be a domain service?
        const { name, fileMimeType, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: driveFileId,
                ...(user?.hasExternalAccount('GOOGLE') && {
                    userAccessToken: user?.getGoogleAccessToken() ?? undefined,
                    userRefreshToken:
                        user?.getGoogleRefreshToken() ?? undefined,
                }),
            })

        if (!Template.isValidFileMimeType(fileMimeType)) {
            throw new UnsupportedTemplateMimetypeError()
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId,
            fileMimeType: fileMimeType,
            ...(user?.hasExternalAccount('GOOGLE') && {
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
