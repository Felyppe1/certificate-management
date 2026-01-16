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
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { IBucket } from './interfaces/cloud/ibucket'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { DataSourceDomainService } from '../domain/domain-service/data-source-domain-service'

interface AddDataSourceByUploadUseCaseInput {
    file: File
    certificateId: string
    userId: string
}

const MIME_TYPE_TO_FILE_EXTENSION: Record<string, string> = {
    [DATA_SOURCE_FILE_EXTENSION.CSV]: 'csv',
    [DATA_SOURCE_FILE_EXTENSION.XLSX]: 'xlsx',
}

export class AddDataSourceByUploadUseCase {
    constructor(
        private bucket: IBucket,
        private certificatesRepository: ICertificatesRepository,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'saveMany' | 'deleteManyByCertificateEmissionId'
        >,
        private spreadsheetContentExtractorFactory: ISpreadsheetContentExtractorFactory,
        private transactionManager: ITransactionManager,
    ) {}

    async execute(input: AddDataSourceByUploadUseCaseInput) {
        const certificate = await this.certificatesRepository.getById(
            input.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificate.getUserId() !== input.userId) {
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

        const { rows } = contentExtractor.extractColumns(buffer)

        const previousDataSourceStorageFileUrl =
            certificate.getDataSourceStorageFileUrl()

        const path = `users/${input.userId}/certificates/${certificate.getId()}/data-source.${MIME_TYPE_TO_FILE_EXTENSION[fileExtension]}`

        await this.bucket.uploadObject({
            buffer,
            bucketName: process.env.CERTIFICATES_BUCKET!,
            objectName: path,
            mimeType: fileExtension,
        })

        const dataSourceDomainService = new DataSourceDomainService()

        const dataSourceRows = dataSourceDomainService.createDataSource({
            certificate,
            newDataSourceData: {
                inputMethod: INPUT_METHOD.UPLOAD,
                driveFileId: null,
                storageFileUrl: path,
                fileName: input.file.name,
                fileExtension,
                thumbnailUrl: null,
                columnsRow: 1,
                dataRowStart: 2,
                rows,
            },
        })

        await this.transactionManager.run(async () => {
            await this.certificatesRepository.update(certificate)

            await this.dataSourceRowsRepository.deleteManyByCertificateEmissionId(
                certificate.getId(),
            )

            await this.dataSourceRowsRepository.saveMany(dataSourceRows)
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
