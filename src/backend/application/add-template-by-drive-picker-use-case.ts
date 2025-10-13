import { INPUT_METHOD, Template } from '../domain/template'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { IFileContentExtractorFactory } from './interfaces/ifile-content-extractor'
import { UnauthorizedError } from '../domain/error/unauthorized-error'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { NotFoundError } from '../domain/error/not-found-error'
import { IExternalUserAccountsRepository } from './interfaces/iexternal-user-accounts-repository'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { IBucket } from './interfaces/ibucket'

interface AddTemplateByDrivePickerUseCaseInput {
    certificateId: string
    fileId: string
    sessionToken: string
}

export class AddTemplateByDrivePickerUseCase {
    constructor(
        private certificateEmissionsRepository: ICertificatesRepository,
        private sessionsRepository: ISessionsRepository,
        private googleDriveGateway: IGoogleDriveGateway,
        private fileContentExtractorFactory: IFileContentExtractorFactory,
        private externalUserAccountsRepository: IExternalUserAccountsRepository,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        >,
        private bucket: Pick<IBucket, 'deleteObject'>,
    ) {}

    async execute(input: AddTemplateByDrivePickerUseCaseInput) {
        console.log('Executing Picker')
        const session = await this.sessionsRepository.getById(
            input.sessionToken,
        )

        if (!session) {
            throw new UnauthorizedError('session-not-found')
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
            throw new UnauthorizedError('external-account-not-found')
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

        if (certificate.getTemplateStorageFileUrl()) {
            await this.bucket.deleteObject({
                bucketName: process.env.CERTIFICATES_BUCKET!,
                objectName: certificate.getTemplateStorageFileUrl()!,
            })
        }

        const newTemplate = Template.create({
            driveFileId: input.fileId,
            storageFileUrl: null,
            inputMethod: INPUT_METHOD.URL,
            fileName: name,
            variables: uniqueVariables,
            fileExtension,
        })

        certificate.setTemplate(newTemplate)

        console.log('New template added:', newTemplate)
        await this.certificateEmissionsRepository.update(certificate)
    }
}
