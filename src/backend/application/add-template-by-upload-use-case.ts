import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { INPUT_METHOD } from '../domain/certificate'
import { Template, TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import { IBucket } from './interfaces/cloud/ibucket'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IFileContentExtractorFactory } from './interfaces/ifile-content-extractor-factory'
import { Liquid } from 'liquidjs'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'

interface AddTemplateByUploadUseCaseInput {
    file: File
    certificateId: string
    userId: string
}

// TODO: melhorar isso
const MIME_TYPE_TO_FILE_EXTENSION: Record<string, string> = {
    [TEMPLATE_FILE_MIME_TYPE.DOCX]: 'docx',
    [TEMPLATE_FILE_MIME_TYPE.PPTX]: 'pptx',
}

export class AddTemplateByUploadUseCase {
    constructor(
        private bucket: Pick<IBucket, 'uploadObject'>,
        private certificatesRepository: ICertificatesRepository,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'resetProcessingStatusByCertificateEmissionId'
        >,
        private fileContentExtractorFactory: Pick<
            IFileContentExtractorFactory,
            'create'
        >,
        private transactionManager: ITransactionManager,
    ) {}

    async execute(input: AddTemplateByUploadUseCaseInput) {
        const certificate = await this.certificatesRepository.getById(
            input.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificate.getUserId() !== input.userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        const fileMimeType = input.file.type

        if (!Template.isValidFileExtension(fileMimeType)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNSUPPORTED_TEMPLATE_MIMETYPE,
            )
        }

        const bytes = await input.file.arrayBuffer()
        const buffer = Buffer.from(bytes)

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
            inputMethod: INPUT_METHOD.UPLOAD,
            driveFileId: null,
            storageFileUrl: path,
            fileName: input.file.name,
            fileMimeType,
            variables: uniqueVariables,
            thumbnailUrl: null,
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

            await this.certificatesRepository.update(certificate)
        })
    }
}
