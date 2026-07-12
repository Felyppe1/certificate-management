import { env } from '@/env'
import { INPUT_METHOD } from '../domain/certificate'
import { Template } from '../domain/template'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { UnexistentTemplateDriveFileIdError } from '../domain/error/validation-error/unexistent-template-drive-file-id-error'
import { UnsupportedTemplateMimetypeError } from '../domain/error/validation-error/unsupported-template-mimetype-error'
import { IGoogleDriveGateway } from './interfaces/gateway/igoogle-drive-gateway'
import { IFileContentExtractorFactory } from './interfaces/extraction/ifile-content-extractor-factory'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { IBucket } from './interfaces/storage/ibucket'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IDataSourceRowsRepository } from './interfaces/repository/write/idata-source-rows-repository'
import { IStringVariableExtractor } from './interfaces/extraction/istring-variable-extractor'
import { IUsersRepository } from './interfaces/repository/write/iusers-repository'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'

interface AddTemplateByUrlUseCaseInput {
    certificateId: string
    fileUrl: string
    userId: string
}

export class AddTemplateByUrlUseCase {
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
        private fileContentExtractorFactory: Pick<
            IFileContentExtractorFactory,
            'create'
        >,
        private bucket: Pick<IBucket, 'uploadObject'>,
        private transactionManager: Pick<ITransactionManager, 'run'>,
        private stringVariableExtractor: Pick<
            IStringVariableExtractor,
            'extractVariables'
        >,
        private usersRepository: Pick<IUsersRepository, 'getById'>,
    ) {}

    async execute(input: AddTemplateByUrlUseCaseInput) {
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

        const driveFileId = Template.getFileIdFromUrl(input.fileUrl)

        if (!driveFileId) {
            throw new UnexistentTemplateDriveFileIdError()
        }

        const user = await this.usersRepository.getById(input.userId)

        const { name, fileMimeType, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: driveFileId,
                userAccessToken: user?.getGoogleAccessToken() ?? undefined,
                userRefreshToken: user?.getGoogleRefreshToken() ?? undefined,
            })

        if (!Template.isValidFileMimeType(fileMimeType)) {
            throw new UnsupportedTemplateMimetypeError()
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId,
            fileMimeType: fileMimeType,
            accessToken: user?.getGoogleAccessToken() ?? undefined,
        })

        const contentExtractor =
            this.fileContentExtractorFactory.create(fileMimeType)

        const content = await contentExtractor.extractText(buffer)

        const uniqueVariables =
            this.stringVariableExtractor.extractVariables(content)

        const newTemplateInput = {
            driveFileId,
            inputMethod: INPUT_METHOD.URL,
            fileName: name,
            variables: uniqueVariables,
            fileMimeType,
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
