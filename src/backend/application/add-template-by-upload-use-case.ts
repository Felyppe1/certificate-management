import { ForbiddenError } from '../domain/error/forbidden-error'
import { NotFoundError } from '../domain/error/not-found-error'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { ValidationError } from '../domain/error/validation-error'
import {
    INPUT_METHOD,
    Template,
    TEMPLATE_FILE_EXTENSION,
} from '../domain/template'
import { IBucket } from './interfaces/ibucket'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { IFileContentExtractorFactory } from './interfaces/ifile-content-extractor'
import { ISessionsRepository } from './interfaces/isessions-repository'

interface AddTemplateByUploadUseCaseInput {
    file: File
    certificateId: string
    sessionToken: string
}

export class AddTemplateByUploadUseCase {
    constructor(
        private bucket: IBucket,
        private sessionsRepository: ISessionsRepository,
        private certificatesRepository: ICertificatesRepository,
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
            throw new UnauthorizedError('session-not-found')
        }

        const certificate = await this.certificatesRepository.getById(
            input.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError('Certificate not found')
        }

        if (certificate.getUserId() !== session.userId) {
            throw new ForbiddenError('Forbidden')
        }

        const fileExtension = input.file.type

        if (!Template.isValidFileExtension(fileExtension)) {
            throw new ValidationError(
                'File extension not supported for template',
            )
        }

        const bytes = await input.file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const contentExtractor = this.fileContentExtractorFactory.create(
            fileExtension as TEMPLATE_FILE_EXTENSION,
        )

        const content = await contentExtractor.extractText(buffer)

        const uniqueVariables = Template.extractVariablesFromContent(content)

        if (certificate.getTemplateStorageFileUrl()) {
            await this.bucket.deleteObject({
                bucketName: process.env.CERTIFICATES_BUCKET!,
                objectName: certificate.getTemplateStorageFileUrl()!,
            })
        }

        const newTemplateInput = {
            inputMethod: INPUT_METHOD.UPLOAD,
            driveFileId: null,
            storageFileUrl: null,
            fileName: input.file.name,
            fileExtension:
                fileExtension.toUpperCase() as TEMPLATE_FILE_EXTENSION,
            variables: uniqueVariables,
            thumbnailUrl: null,
        }

        const newTemplate = certificate.hasTemplate()
            ? new Template({
                  id: certificate.getTemplateId()!,
                  ...newTemplateInput,
              })
            : Template.create(newTemplateInput)

        certificate.setTemplate(newTemplate)

        const path = `users/${session.userId}/templates/${certificate.getTemplateId()}-original.${fileExtension.toLowerCase()}`

        certificate.setTemplateStorageFileUrl(path)

        await this.bucket.uploadObject({
            buffer,
            bucketName: process.env.CERTIFICATES_BUCKET!,
            objectName: path,
            mimeType: fileExtension.toLowerCase(),
        })

        await this.certificatesRepository.update(certificate)
    }
}
