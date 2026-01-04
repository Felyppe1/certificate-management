import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSetsRepository } from './interfaces/repository/idata-sets-repository'
import { GENERATION_STATUS } from '../domain/data-set'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'

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
        private dataSetsRepository: Pick<
            IDataSetsRepository,
            'getByCertificateEmissionId' | 'upsert'
        >,
        private transactionManager: ITransactionManager,
    ) {}

    async execute(data: UpdateCertificateEmissionUseCaseInput) {
        const certificate = await this.certificateEmissionsRepository.getById(
            data.id,
        )

        if (!certificate) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificate.getUserId() !== data.userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        const currentVariableColumnMapping =
            certificate.serialize().variableColumnMapping

        certificate.update({
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.variableColumnMapping !== undefined
                ? { variableColumnMapping: data.variableColumnMapping }
                : {}),
        })

        console.log(
            JSON.stringify(currentVariableColumnMapping),
            JSON.stringify(data.variableColumnMapping),
        )
        // If variableColumnMapping changed, set dataSet generationStatus to PENDING
        if (
            data.variableColumnMapping !== undefined &&
            JSON.stringify(currentVariableColumnMapping) !==
                JSON.stringify(data.variableColumnMapping)
        ) {
            const dataSet =
                await this.dataSetsRepository.getByCertificateEmissionId(
                    certificate.getId(),
                )

            await this.transactionManager.run(async () => {
                if (dataSet) {
                    dataSet.update({
                        generationStatus: null,
                    })

                    await this.dataSetsRepository.upsert(dataSet)
                }

                await this.certificateEmissionsRepository.update(certificate)
            })
        } else {
            await this.certificateEmissionsRepository.update(certificate)
        }
    }
}
