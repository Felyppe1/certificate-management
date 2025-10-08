import { INPUT_METHOD, Template } from '../domain/template'
import { SessionsRepository } from './interfaces/sessions-repository'
import { GoogleDriveGateway } from './interfaces/google-drive-gateway'
import { FileContentExtractorFactory } from './interfaces/file-content-extractor'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { CertificatesRepository } from './interfaces/certificates-repository'
import { NotFoundError } from '../domain/error/not-found-error'
import { ExternalUserAccountsRepository } from './interfaces/external-user-account-repository'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'

interface AddTemplateByDrivePickerUseCaseInput {
    certificateId: string
    fileId: string
    sessionToken: string
}

export class AddTemplateByDrivePickerUseCase {
    constructor(
        private certificateEmissionsRepository: CertificatesRepository,
        private sessionsRepository: SessionsRepository,
        private googleDriveGateway: GoogleDriveGateway,
        private fileContentExtractorFactory: FileContentExtractorFactory,
        private externalUserAccountsRepository: ExternalUserAccountsRepository,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        >,
    ) {}

    async execute(input: AddTemplateByDrivePickerUseCaseInput) {
        console.log('Executing Picker')
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

        const externalAccount =
            await this.externalUserAccountsRepository.getById(
                session.userId,
                'GOOGLE',
            )

        if (!externalAccount) {
            throw new UnauthorizedError('Google account not linked')
        }

        const newData = await this.googleAuthGateway.checkOrGetNewAccessToken({
            accessToken: externalAccount.accessToken,
            refreshToken: externalAccount.refreshToken!,
            accessTokenExpiryDateTime:
                externalAccount.accessTokenExpiryDateTime!,
        })

        if (newData) {
            externalAccount.accessToken = newData.newAccessToken
            externalAccount.accessTokenExpiryDateTime =
                newData.newAccessTokenExpiryDateTime

            await this.externalUserAccountsRepository.update(externalAccount)
        }

        const { name, fileExtension } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: input.fileId,
                userAccessToken: externalAccount.accessToken,
                userRefreshToken: externalAccount.refreshToken || undefined,
            })

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId: input.fileId,
            fileExtension: fileExtension,
            accessToken: externalAccount.accessToken,
        })

        const contentExtractor =
            this.fileContentExtractorFactory.create(fileExtension)

        const content = await contentExtractor.extractText(buffer)

        const uniqueVariables = Template.extractVariablesFromContent(content)

        const newTemplate = Template.create({
            driveFileId: input.fileId,
            storageFileUrl: null,
            inputMethod: INPUT_METHOD.URL,
            fileName: name,
            variables: uniqueVariables,
            fileExtension,
        })

        certificate.addTemplate(newTemplate)

        console.log('New template added:', newTemplate)
        await this.certificateEmissionsRepository.update(certificate)
    }
}
