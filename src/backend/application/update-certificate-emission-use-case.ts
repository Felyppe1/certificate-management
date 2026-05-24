import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'

interface UpdateCertificateEmissionUseCaseInput {
    userId: string
    id: string
    name?: string
    variableColumnMapping?: Record<string, string | null> | null
}

export class UpdateCertificateEmissionUseCase {
    constructor(
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        >,
        private dataSourceRowsRepository: Pick<
            IDataSourceRowsRepository,
            'resetProcessingStatusByCertificateEmissionId'
        >,
        private transactionManager: Pick<ITransactionManager, 'run'>,
    ) {}

    async execute(data: UpdateCertificateEmissionUseCaseInput) {
        const certificateEmission =
            await this.certificateEmissionsRepository.getById(data.id)

        if (!certificateEmission) {
            throw new CertificateNotFoundError()
        }

        if (!certificateEmission.isOwner(data.userId)) {
            throw new NotCertificateOwnerError()
        }

        const currentVariableColumnMapping =
            certificateEmission.serialize().variableColumnMapping

        certificateEmission.update({
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.variableColumnMapping !== undefined
                ? { variableColumnMapping: data.variableColumnMapping }
                : {}),
        })

        // If variableColumnMapping changed, reset processing status
        if (
            data.variableColumnMapping !== undefined &&
            JSON.stringify(currentVariableColumnMapping) !==
                JSON.stringify(data.variableColumnMapping)
        ) {
            await this.transactionManager.run(async () => {
                if (certificateEmission.hasDataSource()) {
                    await this.dataSourceRowsRepository.resetProcessingStatusByCertificateEmissionId(
                        certificateEmission.getId(),
                    )
                }

                await this.certificateEmissionsRepository.update(
                    certificateEmission,
                )
            })
        } else {
            await this.certificateEmissionsRepository.update(
                certificateEmission,
            )
        }
    }
}
