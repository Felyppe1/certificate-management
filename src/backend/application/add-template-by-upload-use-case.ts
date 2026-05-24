import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'
import { UnsupportedTemplateMimetypeError } from '../domain/error/validation-error/unsupported-template-mimetype-error'
import { INPUT_METHOD } from '../domain/certificate'
import { Template } from '../domain/template'
import { IBucket } from './interfaces/cloud/ibucket'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IFileContentExtractorFactory } from './interfaces/ifile-content-extractor-factory'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { IStringVariableExtractor } from './interfaces/istring-variable-extractor'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { env } from '@/env'

interface AddTemplateByUploadUseCaseInput {
    file: File
    certificateId: string
    userId: string
}

export class AddTemplateByUploadUseCase {
    constructor(
        private bucket: Pick<IBucket, 'uploadObject'>,
        private certificatesRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'resetProcessingStatusByCertificateEmissionId'
        >,
        private fileContentExtractorFactory: Pick<
            IFileContentExtractorFactory,
            'create'
        >,
        private transactionManager: Pick<ITransactionManager, 'run'>,
        private stringVariableExtractor: Pick<
            IStringVariableExtractor,
            'extractVariables'
        >,
        private usersRepository: Pick<IUsersRepository, 'getById'>,
    ) {}

    async execute(input: AddTemplateByUploadUseCaseInput) {
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

        const fileMimeType = input.file.type

        if (!Template.isValidFileMimeType(fileMimeType)) {
            throw new UnsupportedTemplateMimetypeError()
        }

        const bytes = await input.file.arrayBuffer()
        const buffer = Buffer.from(bytes)

        const contentExtractor =
            this.fileContentExtractorFactory.create(fileMimeType)

        const content = await contentExtractor.extractText(buffer)

        const uniqueVariables =
            this.stringVariableExtractor.extractVariables(content)

        const user = await this.usersRepository.getById(input.userId)

        const newTemplateInput = {
            inputMethod: INPUT_METHOD.UPLOAD,
            driveFileId: null,
            fileName: input.file.name,
            fileMimeType,
            variables: uniqueVariables,
            thumbnailUrl: null,
            googleAccountEmail: user?.getGoogleEmail() ?? null,
        }

        certificateEmission.setTemplate(newTemplateInput)

        await this.bucket.uploadObject({
            buffer,
            bucketName: env.CERTIFICATES_BUCKET,
            objectName: certificateEmission.getTemplateStorageFileUrl(),
            mimeType: fileMimeType,
        })

        await this.transactionManager.run(async () => {
            if (certificateEmission.hasDataSource()) {
                await this.dataSourceRowsRepository.resetProcessingStatusByCertificateEmissionId(
                    certificateEmission.getId(),
                )
            }

            await this.certificatesRepository.update(certificateEmission)
        })
    }
}
