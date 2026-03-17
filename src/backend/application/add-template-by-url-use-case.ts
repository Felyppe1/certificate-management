import { INPUT_METHOD } from '../domain/certificate'
import {
    TEMPLATE_MIME_TYPE_TO_FILE_EXTENSION,
    Template,
} from '../domain/template'
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
        private transactionManager: ITransactionManager,
        private stringVariableExtractor: Pick<
            IStringVariableExtractor,
            'extractVariables'
        >,
    ) {}

    async execute(input: AddTemplateByUrlUseCaseInput) {
        const certificate = await this.certificateEmissionsRepository.getById(
            input.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        const driveFileId = Template.getFileIdFromUrl(input.fileUrl)

        if (!driveFileId) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNEXISTENT_TEMPLATE_DRIVE_FILE_ID,
            )
        }

        const { name, fileMimeType, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: driveFileId,
            })

        if (!Template.isValidFileMimeType(fileMimeType)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNSUPPORTED_TEMPLATE_MIMETYPE,
            )
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId,
            fileMimeType: fileMimeType,
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
            inputMethod: INPUT_METHOD.URL,
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
