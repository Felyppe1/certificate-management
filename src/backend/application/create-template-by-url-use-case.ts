import {
    INPUT_METHOD,
    Template,
    TEMPLATE_FILE_EXTENSION,
} from '../domain/template'
import { ValidationError } from '../domain/error/validation-error'
import { SessionsRepository } from './interfaces/sessions-repository'
import { GoogleDriveGateway } from './interfaces/google-drive-gateway'
import { FileContentExtractorFactory } from './interfaces/file-content-extractor'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { TemplatesRepository } from './interfaces/templates-repository'

interface CreateTemplateByUrlUseCaseInput {
    fileUrl: string
    sessionToken: string
}

export class CreateTemplateByUrlUseCase {
    constructor(
        private templatesRepository: TemplatesRepository,
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

        // TODO: check if template with fileUrl already exists

        const driveFileId = Template.getFileIdFromUrl(input.fileUrl)

        if (!driveFileId) {
            throw new ValidationError('Invalid file URL')
        }

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
            userId: session.userId,
            driveFileId,
            storageFileUrl: null,
            inputMethod: INPUT_METHOD.URL,
            fileName: name,
            variables: uniqueVariables,
            fileExtension: TEMPLATE_FILE_EXTENSION.DOCX, // TODO: determine file extension based on mimeType
        })

        await this.templatesRepository.save(newTemplate)

        return newTemplate.getId()
    }
}
