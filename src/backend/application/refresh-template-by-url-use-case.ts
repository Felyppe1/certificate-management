import { ForbiddenError } from '../domain/error/forbidden-error'
import { NotFoundError } from '../domain/error/not-found-error'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { ValidationError } from '../domain/error/validation-error'
import { INPUT_METHOD, Template } from '../domain/template'
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
        private certificateEmissionsRepository: CertificatesRepository,
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

        const certificate = await this.certificateEmissionsRepository.getById(
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

        const driveFileId = certificate.getDriveFileId()

        if (!driveFileId) {
            throw new ValidationError(
                'Certificate does not have a drive file ID',
            )
        }

        // TODO: should it be a domain service?
        const { name, fileExtension } =
            await this.googleDriveGateway.getFileMetadata(driveFileId)

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId,
            fileExtension: fileExtension,
        })

        const contentExtractor =
            this.fileContentExtractorFactory.create(fileExtension)

        const content = await contentExtractor.extractText(buffer)

        const uniqueVariables = Template.extractVariablesFromContent(content)

        const newTemplate = Template.create({
            driveFileId,
            storageFileUrl: null,
            fileExtension: fileExtension,
            inputMethod: INPUT_METHOD.URL,
            fileName: name,
            variables: uniqueVariables,
        })

        certificate.addTemplate(newTemplate)

        await this.certificateEmissionsRepository.update(certificate)
    }
}
