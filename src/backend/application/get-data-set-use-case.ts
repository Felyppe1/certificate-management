import { GENERATION_STATUS } from '../domain/data-set'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { AuthenticationError } from '../domain/error/authentication-error'
import { prisma } from '../infrastructure/repository/prisma'
import { ISessionsRepository } from './interfaces/isessions-repository'

interface GetDataSetUseCaseInput {
    dataSetId: string
    sessionToken: string
}

export class GetDataSetUseCase {
    constructor(private sessionsRepository: ISessionsRepository) {}

    async execute({ dataSetId, sessionToken }: GetDataSetUseCaseInput) {
        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new AuthenticationError('session-not-found')
        }

        const dataSet = await prisma.dataSet.findUnique({
            where: {
                id: dataSetId,
            },
        })

        if (!dataSet) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        // TODO: check if the data set belongs to the user
        // if (dataSet.user_id !== session.userId) {
        //     throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        // }

        return {
            id: dataSet.id,
            generationStatus: dataSet.generation_status as GENERATION_STATUS,
            totalBytes: dataSet.total_bytes,
            rows: dataSet.rows as Record<string, any>[],
            dataSourceId: dataSet.data_source_id,
        }
    }
}
