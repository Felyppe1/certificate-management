import { GENERATION_STATUS } from '../domain/data-set'
import { AuthenticationError } from '../domain/error/authentication-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { IDataSetsRepository } from './interfaces/idata-sets-repository'
import { ISessionsRepository } from './interfaces/isessions-repository'

interface UpdateDataSetUseCaseInput {
    dataSetId: string
    generationStatus: GENERATION_STATUS
    sessionToken: string | null
}

export class UpdateDataSetUseCase {
    constructor(
        private dataSetsRepository: Pick<
            IDataSetsRepository,
            'getById' | 'upsert'
        >,
        private sessionsRepository: Pick<ISessionsRepository, 'getById'>,
    ) {}

    async execute(input: UpdateDataSetUseCaseInput) {
        if (input.sessionToken) {
            const session = await this.sessionsRepository.getById(
                input.sessionToken,
            )

            if (!session) {
                throw new AuthenticationError('session-not-found')
            }
        }

        const dataSet = await this.dataSetsRepository.getById(input.dataSetId)

        if (!dataSet) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SET)
        }

        dataSet.update({
            generationStatus: input.generationStatus,
        })

        await this.dataSetsRepository.upsert(dataSet)
    }
}
