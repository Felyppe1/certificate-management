import { INPUT_METHOD } from '../domain/certificate'
import { Template, TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'
import { IFileContentExtractorFactory } from './interfaces/ifile-content-extractor-factory'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { IExternalUserAccountsRepository } from './interfaces/repository/iexternal-user-accounts-repository'
import { IGoogleAuthGateway } from './interfaces/igoogle-auth-gateway'
import { IBucket } from './interfaces/cloud/ibucket'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { Liquid } from 'liquidjs'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'

const MIME_TYPE_TO_FILE_EXTENSION: Record<string, string> = {
    [TEMPLATE_FILE_MIME_TYPE.DOCX]: 'docx',
    [TEMPLATE_FILE_MIME_TYPE.PPTX]: 'pptx',
    [TEMPLATE_FILE_MIME_TYPE.GOOGLE_DOCS]: 'docx',
    [TEMPLATE_FILE_MIME_TYPE.GOOGLE_SLIDES]: 'pptx',
}

interface AddTemplateByDrivePickerUseCaseInput {
    certificateId: string
    fileId: string
    userId: string
}

export class AddTemplateByDrivePickerUseCase {
    constructor(
        private certificateEmissionsRepository: ICertificatesRepository,
        private googleDriveGateway: IGoogleDriveGateway,
        private fileContentExtractorFactory: IFileContentExtractorFactory,
        private externalUserAccountsRepository: IExternalUserAccountsRepository,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'resetProcessingStatusByCertificateEmissionId'
        >,
        private googleAuthGateway: Pick<
            IGoogleAuthGateway,
            'checkOrGetNewAccessToken'
        >,
        private bucket: Pick<IBucket, 'uploadObject'>,
        private transactionManager: ITransactionManager,
    ) {}

    async execute(input: AddTemplateByDrivePickerUseCaseInput) {
        const certificate = await this.certificateEmissionsRepository.getById(
            input.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        const externalAccount =
            await this.externalUserAccountsRepository.getById(
                input.userId,
                'GOOGLE',
            )

        if (!externalAccount) {
            throw new ForbiddenError(
                FORBIDDEN_ERROR_TYPE.GOOGLE_ACCOUNT_NOT_FOUND,
            )
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

        const { name, fileMimeType, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: input.fileId,
                userAccessToken: externalAccount.accessToken,
                userRefreshToken: externalAccount.refreshToken || undefined,
            })

        if (!Template.isValidFileExtension(fileMimeType)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNSUPPORTED_TEMPLATE_MIMETYPE,
            )
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId: input.fileId,
            fileMimeType: fileMimeType,
            accessToken: externalAccount.accessToken,
        })

        const contentExtractor =
            this.fileContentExtractorFactory.create(fileMimeType)

        const content = await contentExtractor.extractText(buffer)

        const cleanedContent = content
            .replaceAll('“', '"')
            .replaceAll('”', '"')
            .replaceAll('’', "'")
            .replaceAll('‘', "'")

        const engine = new Liquid()

        let uniqueVariables: string[]

        try {
            uniqueVariables = engine.variablesSync(cleanedContent)

            const localVariables = new Set<string>()

            // \{% - searches for the opening of a Liquid tag
            // \s* - allows for any amount of whitespace (including line breaks and tabs) after the opening tag
            // (?:assign|capture) - non-capturing group that finds it but doesn't include it in the results
            // \s+ - requires at least one whitespace character after the non-capturing group
            // ([a-zA-Z0-9_\-]+) - captures the variable name, which can include letters, numbers, underscores, and hyphens
            // Ex: {% assign nomeVariavel = ... %} or {% capture nomeVariavel %}
            const localVarsRegex =
                /\{%\s*(?:assign|capture)\s+([a-zA-Z0-9_\-]+)/g
            let match: RegExpExecArray | null

            while ((match = localVarsRegex.exec(cleanedContent)) !== null) {
                localVariables.add(match[1]) // match[1] contém apenas o nome da variável
            }

            uniqueVariables = uniqueVariables.filter(
                variable => !localVariables.has(variable),
            )
        } catch {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.TEMPLATE_VARIABLES_PARSING_ERROR,
            )
        }

        const path = `users/${input.userId}/certificates/${certificate.getId()}/template.${MIME_TYPE_TO_FILE_EXTENSION[fileMimeType]}`

        const newTemplateInput = {
            driveFileId: input.fileId,
            storageFileUrl: path,
            inputMethod: INPUT_METHOD.GOOGLE_DRIVE,
            fileName: name,
            variables: uniqueVariables,
            fileMimeType,
            thumbnailUrl,
        }

        certificate.setTemplate(newTemplateInput)

        await this.bucket.uploadObject({
            buffer,
            bucketName: process.env.CERTIFICATES_BUCKET!,
            objectName: path,
            mimeType: fileMimeType,
        })

        await this.transactionManager.run(async () => {
            if (certificate.hasDataSource()) {
                await this.dataSourceRowsRepository.resetProcessingStatusByCertificateEmissionId(
                    certificate.getId(),
                )
            }

            await this.certificateEmissionsRepository.update(certificate)
        })
    }
}
