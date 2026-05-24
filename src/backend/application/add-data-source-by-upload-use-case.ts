import { INPUT_METHOD } from '../domain/certificate'
import {
    DATA_SOURCE_MIME_TYPE,
    DATA_SOURCE_MIME_TYPE_TO_FILE_EXTENSION,
    DataSource,
    MAX_IMAGE_FILES,
} from '../domain/data-source'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { DataSourceFileRequiredError } from '../domain/error/validation-error/data-source-file-required-error'
import { UnsupportedDataSourceMimetypeError } from '../domain/error/validation-error/unsupported-data-source-mimetype-error'
import { DataSourceImageFilesExceededError } from '../domain/error/validation-error/data-source-image-files-exceeded-error'
import { DataSourceAllFilesNotImagesError } from '../domain/error/validation-error/data-source-all-files-not-images-error'
import { IBucket } from './interfaces/cloud/ibucket'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { DataSourceDomainService } from '../domain/domain-service/data-source-domain-service'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { env } from '@/env'

interface AddDataSourceByUploadUseCaseInput {
    files: File[]
    certificateId: string
    userId: string
}

export class AddDataSourceByUploadUseCase {
    constructor(
        private bucket: Pick<IBucket, 'uploadObject' | 'deleteObject'>,
        private certificatesRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'saveMany' | 'deleteManyByCertificateEmissionId'
        >,
        private spreadsheetContentExtractorFactory: Pick<
            ISpreadsheetContentExtractorFactory,
            'create'
        >,
        private transactionManager: Pick<ITransactionManager, 'run'>,
        private usersRepository: Pick<IUsersRepository, 'getById'>,
    ) {}

    async execute(input: AddDataSourceByUploadUseCaseInput) {
        const certificateEmission = await this.certificatesRepository.getById(
            input.certificateId,
        )

        if (!certificateEmission) {
            throw new CertificateNotFoundError()
        }

        if (!certificateEmission.isOwner(input.userId)) {
            throw new NotCertificateOwnerError()
        }

        if (certificateEmission.isEmitted()) {
            throw new CertificateEmittedError()
        }

        if (input.files.length === 0) {
            throw new DataSourceFileRequiredError()
        }

        for (const file of input.files) {
            if (!DataSource.isValidFileMimeType(file.type)) {
                throw new UnsupportedDataSourceMimetypeError()
            }
        }

        const fileMimeType = input.files[0].type as DATA_SOURCE_MIME_TYPE

        const isImage = DataSource.isImageMimeType(fileMimeType)

        if (isImage) {
            if (input.files.length > MAX_IMAGE_FILES) {
                throw new DataSourceImageFilesExceededError()
            }

            const allFilesAreImages = input.files.every(file =>
                DataSource.isImageMimeType(file.type),
            )

            if (!allFilesAreImages) {
                throw new DataSourceAllFilesNotImagesError()
            }
        } else {
            if (input.files.length !== 1) {
                throw new DataSourceAllFilesNotImagesError()
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
                    bucketName: env.CERTIFICATES_BUCKET,
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

        const user = await this.usersRepository.getById(input.userId)

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
                googleAccountEmail: user?.getGoogleEmail() ?? null,
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
                    bucketName: env.CERTIFICATES_BUCKET,
                    objectName: url,
                }),
            ),
        )
    }
}
