import { GENERATION_STATUS } from '../domain/data-set'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { prisma } from '../infrastructure/repository/prisma'

interface GetDataSetUseCaseInput {
    dataSetId: string
    userId: string
}

export class GetDataSetUseCase {
    async execute({ dataSetId, userId }: GetDataSetUseCaseInput) {
        const dataSet = await prisma.dataSet.findUnique({
            where: {
                id: dataSetId,
            },
        })

        if (!dataSet) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        // TODO: check if the data set belongs to the user
        // if (dataSet.user_id !== userId) {
        //     throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        // }

        return {
            id: dataSet.id,
            generationStatus: dataSet.generation_status as GENERATION_STATUS,
            totalBytes: dataSet.total_bytes,
            rows: dataSet.rows as Record<string, any>[],
            certificateEmissionId: dataSet.certificate_emission_id,
        }
    }
}
