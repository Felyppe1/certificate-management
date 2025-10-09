import { ForbiddenError } from '../domain/error/forbidden-error'
import { NotFoundError } from '../domain/error/not-found-error'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { ValidationError } from '../domain/error/validation-error'
import { INPUT_METHOD, Template } from '../domain/template'
import { CertificatesRepository } from './interfaces/certificates-repository'
import { ExternalUserAccountsRepository } from './interfaces/external-user-account-repository'
import { FileContentExtractorFactory } from './interfaces/file-content-extractor'
import { GoogleDriveGateway } from './interfaces/google-drive-gateway'
import { SessionsRepository } from './interfaces/sessions-repository'

interface RefreshTemplateUseCaseInput {
    sessionToken: string
    certificateId: string
}

export class RefreshTemplateUseCase {
    constructor(
        private certificateEmissionsRepository: CertificatesRepository,
        private sessionsRepository: SessionsRepository,
        private googleDriveGateway: GoogleDriveGateway,
        private fileContentExtractorFactory: FileContentExtractorFactory,
        private externalUserAccountsRepository: ExternalUserAccountsRepository,
    ) {}

    async execute(input: RefreshTemplateUseCaseInput) {
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

        if (!certificate.hasTemplate()) {
            throw new ValidationError(
                'Certificate does not have a template to refresh',
            )
        }

        const driveFileId = certificate.getDriveTemplateFileId()

        if (!driveFileId) {
            throw new ValidationError(
                'Certificate does not have a drive file ID',
            )
        }

        const externalAccount =
            await this.externalUserAccountsRepository.getById(
                certificate.getUserId(),
                'GOOGLE',
            )

        // TODO: should it be a domain service?
        const { name, fileExtension } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: driveFileId,
                userAccessToken: externalAccount?.accessToken,
                userRefreshToken: externalAccount?.refreshToken ?? undefined,
            })

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId,
            fileExtension: fileExtension,
            accessToken: externalAccount?.accessToken,
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

        certificate.setTemplate(newTemplate)

        await this.certificateEmissionsRepository.update(certificate)
    }
}
