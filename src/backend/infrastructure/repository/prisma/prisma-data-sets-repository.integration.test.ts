import { prisma } from '@/tests/setup.integration'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
    DataSet,
    DataSetInput,
    GENERATION_STATUS,
} from '@/backend/domain/data-set'
import {
    Certificate,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '@/backend/domain/certificate'
import {
    DATA_SOURCE_FILE_EXTENSION,
    DataSource,
} from '@/backend/domain/data-source'
import { PrismaCertificatesRepository } from './prisma-certificates-repository'
import { PrismaUsersRepository } from './prisma-users-repository'

const createDataSetData = (
    overrides?: Partial<DataSetInput>,
): DataSetInput => ({
    id: '1',
    certificateEmissionId: '1',
    generationStatus: null,
    totalBytes: 0,
    rows: [{ column: 'variable' }],
    ...overrides,
})

describe('PrismaDataSetsRepository Integration Tests', () => {
    let dataSetsRepository: PrismaDataSetsRepository

    beforeAll(() => {
        dataSetsRepository = new PrismaDataSetsRepository(prisma)
    })

    beforeEach(async () => {
        const usersRepository = new PrismaUsersRepository(prisma)
        const certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )

        const user = {
            id: '1',
            name: 'Felyppe',
            email: 'felyppe@gmail.com',
            passwordHash: 'hashed-password',
        }

        const certificate = new Certificate({
            id: '1',
            name: 'Certificate Name',
            userId: '1',
            status: CERTIFICATE_STATUS.DRAFT,
            createdAt: new Date(),
            variableColumnMapping: null,
            template: null,
            dataSource: new DataSource({
                fileName: 'filename.csv',
                fileExtension: DATA_SOURCE_FILE_EXTENSION.CSV,
                thumbnailUrl: null,
                driveFileId: '1',
                storageFileUrl: null,
                inputMethod: INPUT_METHOD.URL,
                columns: ['column'],
            }),
        })

        await usersRepository.save(user)

        await certificateEmissionsRepository.save(certificate)
    })

    it('should create a data set successfully', async () => {
        const dataSet = new DataSet(createDataSetData())

        await expect(dataSetsRepository.save(dataSet)).resolves.not.toThrow()

        const createdDataSet = await prisma.dataSet.findUnique({
            where: { id: '1' },
        })

        expect(createdDataSet).toEqual({
            id: '1',
            certificate_emission_id: '1',
            generation_status: null,
            total_bytes: 0,
            rows: [{ column: 'variable' }],
        })
    })

    it('should create a data set successfully', async () => {
        const dataSet = new DataSet(createDataSetData())

        await dataSetsRepository.save(dataSet)

        dataSet.update({
            generationStatus: GENERATION_STATUS.PENDING,
            rows: [],
            totalBytes: 10,
        })

        await dataSetsRepository.upsert(dataSet)

        const updatedDataSet = await prisma.dataSet.findUnique({
            where: { id: '1' },
        })

        expect(updatedDataSet).toEqual({
            id: '1',
            certificate_emission_id: '1',
            generation_status: GENERATION_STATUS.PENDING,
            total_bytes: 10,
            rows: [],
        })
    })
})
