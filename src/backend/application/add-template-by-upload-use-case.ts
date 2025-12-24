import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { INPUT_METHOD } from '../domain/certificate'
import { Template, TEMPLATE_FILE_EXTENSION } from '../domain/template'
import { IBucket } from './interfaces/ibucket'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { IFileContentExtractorFactory } from './interfaces/ifile-content-extractor'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { IDataSetsRepository } from './interfaces/idata-sets-repository'
import { Liquid } from 'liquidjs'

interface AddTemplateByUploadUseCaseInput {
    file: File
    certificateId: string
    sessionToken: string
}

// TODO: melhorar isso
const MIME_TYPE_TO_FILE_EXTENSION: Record<string, string> = {
    [TEMPLATE_FILE_EXTENSION.DOCX]: 'docx',
    [TEMPLATE_FILE_EXTENSION.PPTX]: 'pptx',
}

export class AddTemplateByUploadUseCase {
    constructor(
        private bucket: IBucket,
        private sessionsRepository: ISessionsRepository,
        private certificatesRepository: ICertificatesRepository,
        private dataSetsRepository: Pick<
            IDataSetsRepository,
            'getByCertificateEmissionId' | 'upsert'
        >,
        private fileContentExtractorFactory: Pick<
            IFileContentExtractorFactory,
            'create'
        >,
    ) {}

    async execute(input: AddTemplateByUploadUseCaseInput) {
        const session = await this.sessionsRepository.getById(
            input.sessionToken,
        )

        if (!session) {
            throw new AuthenticationError('session-not-found')
        }

        const certificate = await this.certificatesRepository.getById(
            input.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificate.getUserId() !== session.userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        const fileExtension = input.file.type

        if (!Template.isValidFileExtension(fileExtension)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNSUPPORTED_TEMPLATE_MIMETYPE,
            )
        }

        const bytes = await input.file.arrayBuffer()
        const buffer = Buffer.from(bytes)

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

        const previousTemplateStorageFileUrl =
            certificate.getTemplateStorageFileUrl()

        const newTemplateInput = {
            inputMethod: INPUT_METHOD.UPLOAD,
            driveFileId: null,
            storageFileUrl: null,
            fileName: input.file.name,
            fileExtension,
            variables: uniqueVariables,
            thumbnailUrl: null,
        }

        certificate.setTemplate(newTemplateInput)

        const path = `users/${session.userId}/certificates/${certificate.getId()}/template.${MIME_TYPE_TO_FILE_EXTENSION[fileExtension]}`

        certificate.setTemplateStorageFileUrl(path)

        await this.bucket.uploadObject({
            buffer,
            bucketName: process.env.CERTIFICATES_BUCKET!,
            objectName: path,
            mimeType: fileExtension,
        })

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

        await this.certificatesRepository.update(certificate)

        if (previousTemplateStorageFileUrl) {
            await this.bucket.deleteObject({
                bucketName: process.env.CERTIFICATES_BUCKET!,
                objectName: previousTemplateStorageFileUrl,
            })
        }
    }
}
