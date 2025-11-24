import { IDataSetsRepository } from '@/backend/application/interfaces/idata-sets-repository'

interface ResetCertificateGenerationHandlerInput {
    certificateId: string
}

export class ResetCertificateGenerationHandler {
    constructor(private dataSetsRepository: IDataSetsRepository) {}

    async handle({ certificateId }: ResetCertificateGenerationHandlerInput) {
        const dataSet =
            await this.dataSetsRepository.getByCertificateEmissionId(
                certificateId,
            )

        if (dataSet) {
            dataSet.update({
                generationStatus: null,
            })

            await this.dataSetsRepository.upsert(dataSet)
        }
    }
}
