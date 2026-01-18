import { INPUT_METHOD } from '../domain/certificate'
import { Template, TEMPLATE_FILE_EXTENSION } from '../domain/template'
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
import { Liquid } from 'liquidjs'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'

const MIME_TYPE_TO_FILE_EXTENSION: Record<string, string> = {
    [TEMPLATE_FILE_EXTENSION.DOCX]: 'docx',
    [TEMPLATE_FILE_EXTENSION.PPTX]: 'pptx',
    [TEMPLATE_FILE_EXTENSION.GOOGLE_DOCS]: 'docx',
    [TEMPLATE_FILE_EXTENSION.GOOGLE_SLIDES]: 'pptx',
}

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

        const { name, fileExtension, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: driveFileId,
            })

        if (!Template.isValidFileExtension(fileExtension)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNSUPPORTED_TEMPLATE_MIMETYPE,
            )
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId,
            fileExtension: fileExtension,
        })

        const contentExtractor =
            this.fileContentExtractorFactory.create(fileExtension)

        const content = await contentExtractor.extractText(buffer)

        const cleanedContent = content
            .replaceAll('“', '"')
            .replaceAll('”', '"')
            .replaceAll('’', "'")
            .replaceAll('‘', "'")

        const engine = new Liquid()

        let uniqueVariables: string[]

        try {
            uniqueVariables = engine.variablesSync(cleanedContent)
        } catch {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.TEMPLATE_VARIABLES_PARSING_ERROR,
            )
        }

        const path = `users/${input.userId}/certificates/${certificate.getId()}/template.${MIME_TYPE_TO_FILE_EXTENSION[fileExtension]}`

        const newTemplateInput = {
            driveFileId,
            storageFileUrl: path,
            inputMethod: INPUT_METHOD.URL,
            fileName: name,
            variables: uniqueVariables,
            fileExtension,
            thumbnailUrl,
        }

        certificate.setTemplate(newTemplateInput)

        await this.bucket.uploadObject({
            buffer,
            bucketName: process.env.CERTIFICATES_BUCKET!,
            objectName: path,
            mimeType: fileExtension,
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
