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
import { IExternalProcessing } from './interfaces/iexternal-processing'

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
        private externalProcessing: Pick<
            IExternalProcessing,
            'triggerGenerateCertificatePDFs'
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

        const { dataSource, template, ...certificateEmissionData } =
            certificateEmission.serialize()

        const body = {
            certificateEmission: {
                ...certificateEmissionData,
                template: template!,
                dataSource: {
                    ...dataSource!,
                    dataSet: dataSet.serialize(),
                },
            },
        }

        await this.externalProcessing.triggerGenerateCertificatePDFs(body)

        // const generatePdfsUrl = process.env.GENERATE_PDFS_URL!

        // const client = await auth.getIdTokenClient(generatePdfsUrl)
        // await client.request({
        //     url: generatePdfsUrl,
        //     method: 'POST',
        //     data: body,
        // })

        await this.dataSetsRepository.upsert(dataSet)
    }
}
