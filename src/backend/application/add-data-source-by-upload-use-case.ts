import { INPUT_METHOD } from '../domain/certificate'
import {
    DATA_SOURCE_MIME_TYPE,
    DATA_SOURCE_MIME_TYPE_TO_FILE_EXTENSION,
    DataSource,
    MAX_IMAGE_FILES,
} from '../domain/data-source'
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
    files: File[]
    certificateId: string
    userId: string
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
        const certificateEmission = await this.certificatesRepository.getById(
            input.certificateId,
        )

        if (!certificateEmission) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (!certificateEmission.isOwner(input.userId)) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        if (certificateEmission.isEmitted()) {
            throw new ValidationError(VALIDATION_ERROR_TYPE.CERTIFICATE_EMITTED)
        }

        if (input.files.length === 0) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.DATA_SOURCE_FILE_REQUIRED,
            )
        }

        for (const file of input.files) {
            if (!DataSource.isValidFileMimeType(file.type)) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.UNSUPPORTED_DATA_SOURCE_MIMETYPE,
                )
            }
        }

        const fileMimeType = input.files[0].type as DATA_SOURCE_MIME_TYPE

        const isImage = DataSource.isImageMimeType(fileMimeType)

        if (isImage) {
            if (input.files.length > MAX_IMAGE_FILES) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.DATA_SOURCE_IMAGE_FILES_EXCEEDED,
                )
            }

            const allFilesAreImages = input.files.every(file =>
                DataSource.isImageMimeType(file.type),
            )

            if (!allFilesAreImages) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.DATA_SOURCE_ALL_FILES_NOT_IMAGES,
                )
            }
        } else {
            if (input.files.length !== 1) {
                throw new ValidationError(
                    VALIDATION_ERROR_TYPE.DATA_SOURCE_ALL_FILES_NOT_IMAGES,
                )
            }
        }

        const fileExtension =
            DATA_SOURCE_MIME_TYPE_TO_FILE_EXTENSION[fileMimeType]
        const basePath = `users/${input.userId}/certificates/${certificateEmission.getId()}`

        const fileBuffers = await Promise.all(
            input.files.map(async file => {
                const bytes = await file.arrayBuffer()
                return Buffer.from(bytes)
            }),
        )

        const paths = input.files.map((file, index) =>
            isImage
                ? `${basePath}/data-source-${index}.${fileExtension}`
                : `${basePath}/data-source.${fileExtension}`,
        )

        await Promise.all(
            fileBuffers.map((buffer, index) =>
                this.bucket.uploadObject({
                    buffer,
                    bucketName: process.env.CERTIFICATES_BUCKET!,
                    objectName: paths[index],
                    mimeType: fileMimeType,
                }),
            ),
        )

        const contentExtractor = this.spreadsheetContentExtractorFactory.create(
            fileMimeType as DATA_SOURCE_MIME_TYPE,
        )

        const { rows, columns } =
            await contentExtractor.extractColumns(fileBuffers)

        const previousDataSourceStorageFileUrls =
            certificateEmission.getDataSourceStorageFileUrls()

        const dataSourceDomainService = new DataSourceDomainService()

        const dataSourceRows = dataSourceDomainService.createDataSource({
            certificate: certificateEmission,
            newDataSourceData: {
                inputMethod: INPUT_METHOD.UPLOAD,
                files: input.files.map((file, index) => ({
                    fileName: file.name,
                    driveFileId: null,
                    storageFileUrl: paths[index],
                })),
                fileMimeType: fileMimeType,
                thumbnailUrl: null,
                columnsRow: 1,
                dataRowStart: 2,
                columns,
                rows,
            },
        })

        await this.transactionManager.run(async () => {
            await this.certificatesRepository.update(certificateEmission)

            await this.dataSourceRowsRepository.deleteManyByCertificateEmissionId(
                certificateEmission.getId(),
            )

            if (dataSourceRows.length > 0) {
                await this.dataSourceRowsRepository.saveMany(dataSourceRows)
            }
        })

        // TODO: it should be done using outbox pattern
        await Promise.all(
            previousDataSourceStorageFileUrls.map(url =>
                this.bucket.deleteObject({
                    bucketName: process.env.CERTIFICATES_BUCKET!,
                    objectName: url,
                }),
            ),
        )
    }
}
