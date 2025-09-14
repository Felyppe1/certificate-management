import { ForbiddenError } from '../domain/error/forbidden-error'
import { NotFoundError } from '../domain/error/not-found-error'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { ValidationError } from '../domain/error/validation-error'
import {
    INPUT_METHOD,
    Template,
    TEMPLATE_FILE_EXTENSION,
} from '../domain/template'
import { FileContentExtractorFactory } from './interfaces/file-content-extractor'
import { GoogleDriveGateway } from './interfaces/google-drive-gateway'
import { SessionsRepository } from './interfaces/sessions-repository'
import { TemplatesRepository } from './interfaces/templates-repository'

interface RefreshTemplateByUrlUseCaseInput {
    sessionToken: string
    templateId: string
}

export class RefreshTemplateByUrlUseCase {
    constructor(
        private templatesRepository: TemplatesRepository,
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

        const template = await this.templatesRepository.getById(
            input.templateId,
        )

        if (!template) {
            throw new NotFoundError('Template not found')
        }

        if (template.getUserId() !== session.userId) {
            throw new ForbiddenError(
                'You do not have permission to update this template',
            )
        }

        const driveFileId = template.getDriveFileId()

        if (!driveFileId) {
            throw new ValidationError('Template does not have a drive file ID')
        }

        // TODO: should it be a domain service?
        const { name, mimeType } =
            await this.googleDriveGateway.getFileMetadata(driveFileId)

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId,
            mimeType: mimeType,
        })

        const contentExtractor =
            this.fileContentExtractorFactory.create(mimeType)

        const content = await contentExtractor.extractText(buffer)

        const uniqueVariables = Template.extractVariablesFromContent(content)

        const newTemplate = Template.create({
            driveFileId,
            userId: session.userId,
            storageFileUrl: null,
            fileExtension: TEMPLATE_FILE_EXTENSION.DOCX, // TODO: determine file extension based on mimeType
            inputMethod: INPUT_METHOD.URL,
            fileName: name,
            variables: uniqueVariables,
        })

        await this.templatesRepository.update(newTemplate)
    }
}
