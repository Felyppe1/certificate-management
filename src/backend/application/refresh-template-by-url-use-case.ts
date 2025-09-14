import { ForbiddenError } from '../domain/error/forbidden-error'
import { NotFoundError } from '../domain/error/not-found-error'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { ValidationError } from '../domain/error/validation-error'
import { Template, TEMPLATE_TYPE } from '../domain/template'
import { CertificatesRepository } from './interfaces/certificates-repository'
import { FileContentExtractorFactory } from './interfaces/file-content-extractor'
import { GoogleDriveGateway } from './interfaces/google-drive-gateway'
import { SessionsRepository } from './interfaces/sessions-repository'

interface RefreshTemplateByUrlUseCaseInput {
    sessionToken: string
    certificateId: string
}

export class RefreshTemplateByUrlUseCase {
    constructor(
        private certificatesRepository: CertificatesRepository,
        private sessionsRepository: SessionsRepository,
        private googleDriveGateway: GoogleDriveGateway,
        private fileContentExtractorFactory: FileContentExtractorFactory,
    ) {}

    async execute(input: RefreshTemplateByUrlUseCaseInput) {
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

        if (!certificate.hasTemplate()) {
            throw new NotFoundError('Certificate does not have a template')
        }

        const fileId = certificate.getTemplateFileId()

        if (!fileId) {
            throw new ValidationError('Template does not have a file ID')
        }

        // TODO: should it be a domain service?
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
