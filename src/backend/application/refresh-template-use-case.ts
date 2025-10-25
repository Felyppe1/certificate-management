import { ForbiddenError } from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { AuthenticationError } from '../domain/error/authentication-error'
import { ValidationError } from '../domain/error/validation-error'
import { INPUT_METHOD, Template } from '../domain/template'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { IExternalUserAccountsRepository } from './interfaces/iexternal-user-accounts-repository'
import { IFileContentExtractorFactory } from './interfaces/ifile-content-extractor'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { ISessionsRepository } from './interfaces/isessions-repository'

interface RefreshTemplateUseCaseInput {
    sessionToken: string
    certificateId: string
}

export class RefreshTemplateUseCase {
    constructor(
        private certificateEmissionsRepository: ICertificatesRepository,
        private sessionsRepository: ISessionsRepository,
        private googleDriveGateway: IGoogleDriveGateway,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        >,
        private fileContentExtractorFactory: IFileContentExtractorFactory,
        private externalUserAccountsRepository: IExternalUserAccountsRepository,
    ) {}

    async execute(input: RefreshTemplateUseCaseInput) {
        const session = await this.sessionsRepository.getById(
            input.sessionToken,
        )

        if (!session) {
            throw new AuthenticationError('session-not-found')
        }

        const certificate = await this.certificateEmissionsRepository.getById(
            input.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
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
            throw new ValidationError('Template does not have a drive file ID')
        }

        const externalAccount =
            await this.externalUserAccountsRepository.getById(
                certificate.getUserId(),
                'GOOGLE',
            )

        if (externalAccount) {
            const newData =
                await this.googleAuthGateway.checkOrGetNewAccessToken({
                    accessToken: externalAccount.accessToken,
                    refreshToken: externalAccount.refreshToken!,
                    accessTokenExpiryDateTime:
                        externalAccount.accessTokenExpiryDateTime!,
                })

            if (newData) {
                externalAccount.accessToken = newData.newAccessToken
                externalAccount.accessTokenExpiryDateTime =
                    newData.newAccessTokenExpiryDateTime

                await this.externalUserAccountsRepository.update(
                    externalAccount,
                )
            }
        }

        // TODO: should it be a domain service?
        const { name, fileExtension, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: driveFileId,
                userAccessToken: externalAccount?.accessToken,
                userRefreshToken: externalAccount?.refreshToken ?? undefined,
            })

        if (!Template.isValidFileExtension(fileExtension)) {
            throw new ValidationError(
                'File extension not supported for template',
            )
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId,
            fileExtension: fileExtension,
            accessToken: externalAccount?.accessToken,
        })

        const contentExtractor =
            this.fileContentExtractorFactory.create(fileExtension)

        const content = await contentExtractor.extractText(buffer)

        const uniqueVariables = Template.extractVariablesFromContent(content)

        const newTemplateInput = {
            driveFileId,
            storageFileUrl: null,
            fileExtension: fileExtension,
            inputMethod: INPUT_METHOD.URL,
            fileName: name,
            variables: uniqueVariables,
            thumbnailUrl,
        }

        if (certificate.hasTemplate()) {
            certificate.updateTemplate(newTemplateInput)
        } else {
            certificate.setTemplate(newTemplateInput)
        }

        await this.certificateEmissionsRepository.update(certificate)
    }
}
