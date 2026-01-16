import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'

import { IGoogleDriveGateway } from './interfaces/igoogle-drive-gateway'

import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { IBucket } from './interfaces/cloud/ibucket'
import { ISpreadsheetContentExtractorFactory } from './interfaces/ispreadsheet-content-extractor-factory'
import { INPUT_METHOD } from '../domain/certificate'
import { DataSource } from '../domain/data-source'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { DataSourceDomainService } from '../domain/domain-service/data-source-domain-service'

interface AddDataSourceByUrlUseCaseInput {
    certificateId: string
    fileUrl: string
    userId: string
}

export class AddDataSourceByUrlUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'saveMany' | 'deleteManyByCertificateEmissionId'
        >,
        private googleDriveGateway: Pick<
            IGoogleDriveGateway,
            'getFileMetadata' | 'downloadFile'
        >,
        private spreadsheetContentExtractorFactory: ISpreadsheetContentExtractorFactory,
        private bucket: Pick<IBucket, 'deleteObject'>,
        private transactionManager: ITransactionManager,
    ) {}

    async execute(input: AddDataSourceByUrlUseCaseInput) {
        const certificate = await this.certificateEmissionsRepository.getById(
            input.certificateId,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        const driveFileId = DataSource.getFileIdFromUrl(input.fileUrl)

        if (!driveFileId) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNEXISTENT_DATA_SOURCE_DRIVE_FILE_ID,
            )
        }

        const { name, fileExtension, thumbnailUrl } =
            await this.googleDriveGateway.getFileMetadata({
                fileId: driveFileId,
            })

        if (!DataSource.isValidFileExtension(fileExtension)) {
            throw new ValidationError(
                VALIDATION_ERROR_TYPE.UNSUPPORTED_DATA_SOURCE_MIMETYPE,
            )
        }

        const buffer = await this.googleDriveGateway.downloadFile({
            driveFileId,
            fileExtension: fileExtension,
        })

        const contentExtractor =
            this.spreadsheetContentExtractorFactory.create(fileExtension)

        const { columns, rows } = contentExtractor.extractColumns(buffer)

        // In case it had files in storage, delete them
        const dataSourceStorageFileUrl =
            certificate.getDataSourceStorageFileUrl()

        const dataSourceDomainService = new DataSourceDomainService()

        const dataSourceRows = dataSourceDomainService.createDataSource({
            certificate,
            newDataSourceData: {
                driveFileId,
                storageFileUrl: null,
                fileName: name,
                fileExtension,
                inputMethod: INPUT_METHOD.URL,
                thumbnailUrl,
                columnsRow: 1,
                dataRowStart: 2,
                rows,
            },
        })

        // const newDataSourceInput = {
        //     driveFileId,
        //     storageFileUrl: null,
        //     inputMethod: INPUT_METHOD.URL,
        //     fileName: name,
        //     fileExtension,
        //     thumbnailUrl,
        //     rows,
        //     columnsRow: 1,
        //     dataRowStart: 2,
        // }

        // certificate.setDataSource(newDataSourceInput)

        // const dataSourceColumns = certificate.getDataSourceColumns()

        // const dataSourceRows = rows.map(row => {
        //     const data = Object.entries(row).map(([columnName, value]) => {
        //         return {
        //             columnName,
        //             value,
        //             type: dataSourceColumns.find(column => column.name === columnName)!.type // TODO: it can only have the ! operator safely when validating if all the columns are in the columns variable
        //         }
        //     })

        //     return DataSourceRow.create({
        //         certificateEmissionId: certificate.getId(),
        //         data,
        //     })
        // })

        await this.transactionManager.run(async () => {
            await this.certificateEmissionsRepository.update(certificate)

            await this.dataSourceRowsRepository.deleteManyByCertificateEmissionId(
                certificate.getId(),
            )

            await this.dataSourceRowsRepository.saveMany(dataSourceRows)
        })

        if (dataSourceStorageFileUrl) {
            await this.bucket.deleteObject({
                bucketName: process.env.CERTIFICATES_BUCKET!,
                objectName: dataSourceStorageFileUrl,
            })
        }
    }
}
