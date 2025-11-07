import { AuthenticationError } from '../domain/error/authentication-error'
import {
    FORBIDDEN_ERROR_TYPE,
    ForbiddenError,
} from '../domain/error/forbidden-error'
import {
    NOT_FOUND_ERROR_TYPE,
    NotFoundError,
} from '../domain/error/not-found-error'
import { ISessionsRepository } from './interfaces/isessions-repository'
import { GENERATION_STATUS } from '../domain/data-set'
import { ICertificatesRepository } from './interfaces/icertificates-repository'
import { IDataSetsRepository } from './interfaces/idata-sets-repository'
import {
    VALIDATION_ERROR_TYPE,
    ValidationError,
} from '../domain/error/validation-error'
import { GoogleAuth } from 'google-auth-library'

interface GenerateCertificatesUseCaseInput {
    certificateEmissionId: string
    sessionToken: string
}

export class GenerateCertificatesUseCase {
    constructor(
        private sessionsRepository: Pick<ISessionsRepository, 'getById'>,
        private certificateEmissionsRepository: Pick<
            ICertificatesRepository,
            'getById'
        >,
        private dataSetsRepository: Pick<
            IDataSetsRepository,
            'getByDataSourceId' | 'upsert'
        >,
    ) {}

    async execute({
        certificateEmissionId,
        sessionToken,
    }: GenerateCertificatesUseCaseInput) {
        const session = await this.sessionsRepository.getById(sessionToken)

        if (!session) {
            throw new AuthenticationError('session-not-found')
        }

        const certificateEmission =
            await this.certificateEmissionsRepository.getById(
                certificateEmissionId,
            )

        if (!certificateEmission) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.CERTIFICATE)
        }

        if (certificateEmission.getUserId() !== session.userId) {
            throw new ForbiddenError(FORBIDDEN_ERROR_TYPE.NOT_CERTIFICATE_OWNER)
        }

        if (!certificateEmission.hasTemplate()) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.TEMPLATE)
        }

        if (!certificateEmission.hasDataSource()) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SOURCE)
        }

        const dataSet = await this.dataSetsRepository.getByDataSourceId(
            certificateEmission.getDataSourceId()!,
        )

        if (!dataSet) {
            throw new NotFoundError(NOT_FOUND_ERROR_TYPE.DATA_SET)
        }

        if (dataSet.hasRows() === false) {
            throw new ValidationError(VALIDATION_ERROR_TYPE.NO_DATA_SET_ROWS)
        }

        dataSet.update({
            generationStatus: GENERATION_STATUS.PENDING,
        })

        const { dataSource, ...certificateEmissionData } =
            certificateEmission.serialize()

        const body = {
            certificateEmission: {
                ...certificateEmissionData,
                dataSource: {
                    ...dataSource,
                    dataSet: dataSet.serialize(),
                },
            },
        }

        // const generatePdfsUrl = process.env.GENERATE_PDFS_URL!

        // const client = await auth.getIdTokenClient(generatePdfsUrl)
        // await client.request({
        //     url: generatePdfsUrl,
        //     method: 'POST',
        //     data: body,
        // })

        const generatePdfsUrl = process.env.GENERATE_PDFS_URL!

        const auth = new GoogleAuth()
        const client = await auth.getIdTokenClient(generatePdfsUrl)
        const idToken =
            await client.idTokenProvider.fetchIdToken(generatePdfsUrl)

        const response = await fetch(generatePdfsUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify(body),
        })

        if (!response.ok) {
            const text = await response.text()
            throw new Error(`Failed (${response.status}): ${text}`)
        }

        await this.dataSetsRepository.upsert(dataSet)

        // if (!response.ok) {
        //     throw new Error('Cloud function invocation failed')
        // }
    }
}
