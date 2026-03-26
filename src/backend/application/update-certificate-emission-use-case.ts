import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
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
        private transactionManager: ITransactionManager,
    ) {}

    async execute(data: UpdateCertificateEmissionUseCaseInput) {
        const certificateEmission =
            await this.certificateEmissionsRepository.getById(data.id)

        if (!certificateEmission) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (!certificateEmission.isOwner(data.userId)) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
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
