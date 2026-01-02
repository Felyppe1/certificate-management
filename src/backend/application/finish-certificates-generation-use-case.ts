import { GENERATION_STATUS } from '../domain/data-set'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { IDataSetsRepository } from './interfaces/idata-sets-repository'

interface FinishCertificatesGenerationUseCaseInput {
    certificateEmissionId: string
    generationStatus?: GENERATION_STATUS | null
    totalBytes?: number
}

export class FinishCertificatesGenerationSetUseCase {
    constructor(
        private dataSetsRepository: Pick<
            IDataSetsRepository,
            'getById' | 'upsert' | 'getByCertificateEmissionId'
        >,
    ) {}

    async execute(input: FinishCertificatesGenerationUseCaseInput) {
        const dataSet =
            await this.dataSetsRepository.getByCertificateEmissionId(
                input.certificateEmissionId,
            )

        if (!dataSet) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SET)
        }

        dataSet.update({
            generationStatus: input.generationStatus,
            totalBytes: input.totalBytes,
        })

        await this.dataSetsRepository.upsert(dataSet)
    }
}
