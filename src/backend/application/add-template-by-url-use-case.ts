import { INPUT_METHOD } from '../domain/certificate'
import { Template } from '../domain/template'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { IFileContentExtractorFactory } from './interfaces/ifile-content-extractor'
import { AuthenticationError } from '../domain/error/authentication-error'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { IBucket } from './interfaces/ibucket'
import { IDataSetsRepository } from './interfaces/idata-sets-repository'

interface AddTemplateByUrlUseCaseInput {
    certificateId: string
    fileUrl: string
    sessionToken: string
}

export class AddTemplateByUrlUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private dataSetsRepository: Pick<
            IDataSetsRepository,
            'getByCertificateEmissionId' | 'upsert'
        >,
        private sessionsRepository: Pick<ISessionsRepository, 'getById'>,
        private googleDriveGateway: Pick<
            IGoogleDriveGateway,
            'getFileMetadata' | 'downloadFile'
        >,
        private fileContentExtractorFactory: Pick<
            IFileContentExtractorFactory,
            'create'
        >,
        private bucket: Pick<IBucket, 'deleteObject'>,
    ) {}

    async execute(input: AddTemplateByUrlUseCaseInput) {
        const session = await this.sessionsRepository.getById(
            input.sessionToken,
        )

        if (!session) {
            throw new AuthenticationError('session-not-found')
        }

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

        const uniqueVariables = Template.extractVariablesFromContent(content)

        const templateStorageFileUrl = certificate.getTemplateStorageFileUrl()

        const newTemplateInput = {
            driveFileId,
            storageFileUrl: null,
            inputMethod: INPUT_METHOD.URL,
            fileName: name,
            variables: uniqueVariables,
            fileExtension,
            thumbnailUrl,
        }

        certificate.setTemplate(newTemplateInput)

        const dataSet =
            await this.dataSetsRepository.getByCertificateEmissionId(
                certificate.getId(),
            )

        if (dataSet) {
            dataSet.update({
                generationStatus: null,
            })

            await this.dataSetsRepository.upsert(dataSet)
        }

        await this.certificateEmissionsRepository.update(certificate)

        if (templateStorageFileUrl) {
            await this.bucket.deleteObject({
                bucketName: process.env.CERTIFICATES_BUCKET!,
                objectName: templateStorageFileUrl,
            })
        }
    }
}
