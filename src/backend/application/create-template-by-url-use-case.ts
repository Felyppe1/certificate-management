import { Template, TEMPLATE_TYPE } from '../domain/template'
import { ValidationError } from '../domain/error/validation-error'
import { CertificatesRepository } from './interfaces/certificates-repository'
import { NotFoundError } from '../domain/error/not-found-error'
import { SessionsRepository } from './interfaces/sessions-repository'
import { ForbiddenError } from '../domain/error/forbidden-error'
import { GoogleDriveGateway } from './interfaces/google-drive-gateway'
import { FileContentExtractorFactory } from './interfaces/file-content-extractor'
import { UnauthorizedError } from '../domain/error/unauthorized-error'

interface CreateTemplateByUrlUseCaseInput {
    certificateId: string
    fileUrl: string
    sessionToken: string
}

export class CreateTemplateByUrlUseCase {
    constructor(
        private certificatesRepository: CertificatesRepository,
        private sessionsRepository: SessionsRepository,
        private googleDriveGateway: GoogleDriveGateway,
        private fileContentExtractorFactory: FileContentExtractorFactory,
    ) {}

    async execute(input: CreateTemplateByUrlUseCaseInput) {
        const session = await this.sessionsRepository.getById(
            input.sessionToken,
        )

        if (!session) {
            throw new UnauthorizedError('Session not found')
        }

        const certificate = await this.certificatesRepository.getById(
            input.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError('Certificate not found')
        }

        if (certificate.getUserId() !== session.userId) {
            throw new ForbiddenError(
                'You do not have permission to update this certificate',
            )
        }

        const fileId = Template.getFileIdFromUrl(input.fileUrl)

        if (!fileId) {
            throw new ValidationError('Invalid file URL')
        }

        const { name, mimeType } =
            await this.googleDriveGateway.getFileMetadata(fileId)

        const buffer = await this.googleDriveGateway.downloadFile({
            fileId,
            mimeType: mimeType,
        })

        const contentExtractor =
            this.fileContentExtractorFactory.create(mimeType)

        const content = await contentExtractor.extractText(buffer)

        const uniqueVariables = Template.extractVariablesFromContent(content)

        const newTemplate = Template.create({
            fileId,
            bucketUrl: null,
            type: TEMPLATE_TYPE.URL,
            fileName: name,
            variables: uniqueVariables,
        })

        certificate.addTemplate(newTemplate)

        await this.certificatesRepository.update(certificate)
    }
}
