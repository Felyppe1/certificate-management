import { INPUT_METHOD, Template } from '../domain/template'
import { ValidationError } from '../domain/error/validation-error'
import { SessionsRepository } from './interfaces/sessions-repository'
import { GoogleDriveGateway } from './interfaces/google-drive-gateway'
import { FileContentExtractorFactory } from './interfaces/file-content-extractor'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { CertificatesRepository } from './interfaces/certificates-repository'
import { NotFoundError } from '../domain/error/not-found-error'

interface AddTemplateByUrlUseCaseInput {
    certificateId: string
    fileUrl: string
    sessionToken: string
}

export class AddTemplateByUrlUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            CertificatesRepository,
            'getById' | 'update'
        >,
        private sessionsRepository: Pick<SessionsRepository, 'getById'>,
        private googleDriveGateway: Pick<
            GoogleDriveGateway,
            'getFileMetadata' | 'downloadFile'
        >,
        private fileContentExtractorFactory: Pick<
            FileContentExtractorFactory,
            'create'
        >,
    ) {}

    async execute(input: AddTemplateByUrlUseCaseInput) {
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

        const driveFileId = Template.getFileIdFromUrl(input.fileUrl)

        if (!driveFileId) {
            throw new ValidationError('Invalid file URL')
        }

        const { name, fileExtension } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: driveFileId,
            })

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
            inputMethod: INPUT_METHOD.URL,
            fileName: name,
            variables: uniqueVariables,
            fileExtension,
        })

        certificate.setTemplate(newTemplate)

        await this.certificateEmissionsRepository.update(certificate)
    }
}
