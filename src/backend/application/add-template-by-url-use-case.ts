import { INPUT_METHOD } from '../domain/certificate'
import { Template } from '../domain/template'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { IFileContentExtractorFactory } from './interfaces/ifile-content-extractor-factory'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { IBucket } from './interfaces/cloud/ibucket'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { IStringVariableExtractor } from './interfaces/istring-variable-extractor'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'

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
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (!certificateEmission.isOwner(input.userId)) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        if (certificateEmission.isEmitted()) {
            throw new ValidationError(VALIDATION_ERROR_TYPE.CERTIFICATE_EMITTED)
        }

        const driveFileId = Template.getFileIdFromUrl(input.fileUrl)

        if (!driveFileId) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNEXISTENT_TEMPLATE_DRIVE_FILE_ID,
            )
        }

        const user = await this.usersRepository.getById(input.userId)
        const externalAccount = user?.getExternalAccount('GOOGLE')

        const { name, fileMimeType, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: driveFileId,
                userAccessToken: externalAccount?.getAccessToken(),
                userRefreshToken:
                    externalAccount?.getRefreshToken() || undefined,
            })

        if (!Template.isValidFileMimeType(fileMimeType)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNSUPPORTED_TEMPLATE_MIMETYPE,
            )
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId,
            fileMimeType: fileMimeType,
            accessToken: externalAccount?.getAccessToken(),
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
        }

        certificateEmission.setTemplate(newTemplateInput)

        await this.bucket.uploadObject({
            buffer,
            bucketName: process.env.CERTIFICATES_BUCKET!,
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
