import { DataSet } from '../domain/data-set'
import { INPUT_METHOD } from '../domain/certificate'
import { DATA_SOURCE_FILE_EXTENSION, DataSource } from '../domain/data-source'
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
import { IBucket } from './interfaces/ibucket'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { IDataSetsRepository } from './interfaces/idata-sets-repository'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'
import { ITransactionManager } from './interfaces/itransaction-manager'

interface AddDataSourceByUploadUseCaseInput {
    file: File
    certificateId: string
    sessionToken: string
}

const MIME_TYPE_TO_FILE_EXTENSION: Record<string, string> = {
    [DATA_SOURCE_FILE_EXTENSION.CSV]: 'csv',
    [DATA_SOURCE_FILE_EXTENSION.XLSX]: 'xlsx',
}

export class AddDataSourceByUploadUseCase {
    constructor(
        private bucket: IBucket,
        private sessionsRepository: ISessionsRepository,
        private certificatesRepository: ICertificatesRepository,
        private dataSetsRepository: Pick<IDataSetsRepository, 'upsert'>,
        private spreadsheetContentExtractorFactory: ISpreadsheetContentExtractorFactory,
        private transactionManager: ITransactionManager,
    ) {}

    async execute(input: AddDataSourceByUploadUseCaseInput) {
        const session = await this.sessionsRepository.getById(
            input.sessionToken,
        )

        if (!session) {
            throw new AuthenticationError('session-not-found')
        }

        const certificate = await this.certificatesRepository.getById(
            input.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificate.getUserId() !== session.userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        const fileExtension = input.file.type

        if (!DataSource.isValidFileExtension(fileExtension)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNSUPPORTED_DATA_SOURCE_MIMETYPE,
            )
        }

        const bytes = await input.file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const contentExtractor =
            this.spreadsheetContentExtractorFactory.create(fileExtension)

        const { columns, rows } = contentExtractor.extractColumns(buffer)

        const previousDataSourceStorageFileUrl =
            certificate.getDataSourceStorageFileUrl()

        const newDataSourceInput = {
            inputMethod: INPUT_METHOD.UPLOAD,
            driveFileId: null,
            storageFileUrl: null,
            fileName: input.file.name,
            fileExtension,
            columns,
            thumbnailUrl: null,
        }

        certificate.setDataSource(newDataSourceInput)

        const path = `users/${session.userId}/certificates/${certificate.getId()}/data-source.${MIME_TYPE_TO_FILE_EXTENSION[fileExtension]}`

        certificate.setDataSourceStorageFileUrl(path)

        await this.bucket.uploadObject({
            buffer,
            bucketName: process.env.CERTIFICATES_BUCKET!,
            objectName: path,
            mimeType: fileExtension,
        })

        const newDataSet = DataSet.create({
            certificateEmissionId: certificate.getId(),
            rows,
        })

        await this.transactionManager.run(async () => {
            await this.certificatesRepository.update(certificate)

            await this.dataSetsRepository.upsert(newDataSet)
        })

        // TODO: it should be done using outbox pattern
        if (previousDataSourceStorageFileUrl) {
            await this.bucket.deleteObject({
                bucketName: process.env.CERTIFICATES_BUCKET!,
                objectName: previousDataSourceStorageFileUrl,
            })
        }
    }
}
