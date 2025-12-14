import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { INPUT_METHOD } from '../domain/certificate'
import { Template } from '../domain/template'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { IExternalUserAccountsRepository } from './interfaces/iexternal-user-accounts-repository'
import { IFileContentExtractorFactory } from './interfaces/ifile-content-extractor'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { IDataSetsRepository } from './interfaces/idata-sets-repository'

interface RefreshTemplateUseCaseInput {
    sessionToken: string
    certificateId: string
}

export class RefreshTemplateUseCase {
    constructor(
        private certificateEmissionsRepository: ICertificatesRepository,
        private dataSetsRepository: Pick<
            IDataSetsRepository,
            'getByCertificateEmissionId' | 'upsert'
        >,
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
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        if (!certificate.hasTemplate()) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.TEMPLATE)
        }

        const driveFileId = certificate.getDriveTemplateFileId()

        if (!driveFileId) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNEXISTENT_TEMPLATE_DRIVE_FILE_ID,
            )
        }

        const externalAccount =
            await this.externalUserAccountsRepository.getById(
                certificate.getUserId(),
                'GOOGLE',
            )

        if (
            certificate.getTemplateInputMethod() === INPUT_METHOD.GOOGLE_DRIVE
        ) {
            if (!externalAccount) {
                throw new AuthenticationError('external-account-not-found')
            }

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
                ...(certificate.getTemplateInputMethod() ===
                    INPUT_METHOD.GOOGLE_DRIVE && {
                    userAccessToken: externalAccount?.accessToken,
                    userRefreshToken:
                        externalAccount?.refreshToken ?? undefined,
                }),
            })

        if (!Template.isValidFileExtension(fileExtension)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNSUPPORTED_TEMPLATE_MIMETYPE,
            )
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId,
            fileExtension: fileExtension,
            ...(certificate.getTemplateInputMethod() ===
                INPUT_METHOD.GOOGLE_DRIVE && {
                accessToken: externalAccount?.accessToken,
            }),
        })

        const contentExtractor =
            this.fileContentExtractorFactory.create(fileExtension)

        const content = await contentExtractor.extractText(buffer)

        const uniqueVariables = Template.extractVariablesFromContent(content)

        const newTemplateInput = {
            driveFileId,
            storageFileUrl: null,
            fileExtension: fileExtension,
            inputMethod: INPUT_METHOD.GOOGLE_DRIVE,
            fileName: name,
            variables: uniqueVariables,
            thumbnailUrl,
        }

        certificate.setTemplate(newTemplateInput)

        const dataSet =
            await this.dataSetsRepository.getByCertificateEmissionId(
                certificate.getId(),
            )

        if (dataSet) {
            dataSet.update({
                generationStatus: null,
            })

            await this.dataSetsRepository.upsert(dataSet)
        }

        await this.certificateEmissionsRepository.update(certificate)
    }
}
