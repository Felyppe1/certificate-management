import { prisma } from '@/tests/setup.integration'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
    Certificate,
    CERTIFICATE_STATUS,
    CertificateInput,
    INPUT_METHOD,
} from '@/backend/domain/certificate'
import {
    DATA_SOURCE_FILE_EXTENSION,
    DataSource,
    DataSourceInput,
} from '@/backend/domain/data-source'
import { PrismaCertificatesRepository } from './prisma-certificates-repository'
import { PrismaUsersRepository } from './prisma-users-repository'
import {
    Template,
    TEMPLATE_FILE_EXTENSION,
    TemplateInput,
} from '@/backend/domain/template'
import { PrismaEmailsRepository } from './prisma-emails-repository'
import {
    Email,
    EmailInput,
    PROCESSING_STATUS_ENUM,
} from '@/backend/domain/email'
import {
    DataSet,
    DataSetInput,
    GENERATION_STATUS,
} from '@/backend/domain/data-set'
import { PrismaDataSetsRepository } from './prisma-data-sets-repository'

const createTemplateData = (
    overrides?: Partial<TemplateInput>,
): TemplateInput => ({
    fileExtension: TEMPLATE_FILE_EXTENSION.DOCX,
    inputMethod: INPUT_METHOD.URL,
    driveFileId: '1',
    storageFileUrl: null,
    fileName: 'File Name',
    variables: [],
    thumbnailUrl: null,
    ...overrides,
})

const createDataSourceData = (
    overrides?: Partial<DataSourceInput>,
): DataSourceInput => ({
    fileExtension: DATA_SOURCE_FILE_EXTENSION.CSV,
    inputMethod: INPUT_METHOD.URL,
    driveFileId: '1',
    storageFileUrl: null,
    fileName: 'File Name',
    columns: [],
    thumbnailUrl: null,
    ...overrides,
})

const createCertificateData = (
    overrides?: Partial<CertificateInput>,
): CertificateInput => ({
    id: '1',
    name: 'Certificate Name',
    userId: '1',
    template: null,
    createdAt: new Date(),
    status: CERTIFICATE_STATUS.DRAFT,
    dataSource: null,
    variableColumnMapping: null,
    ...overrides,
})

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

const createEmailData = (overrides?: Partial<EmailInput>): EmailInput => ({
    id: '1',
    certificateEmissionId: '1',
    subject: 'Subject',
    body: 'Body',
    emailColumn: 'column',
    scheduledAt: null,
    emailErrorType: null,
    status: PROCESSING_STATUS_ENUM.RUNNING,
    ...overrides,
})

describe('PrismaEmailsRepository Integration Tests', () => {
    let certificateEmissionsRepository: PrismaCertificatesRepository
    let emailsRepository: PrismaEmailsRepository
    let dataSetsRepository: PrismaDataSetsRepository

    beforeAll(() => {
        certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )

        dataSetsRepository = new PrismaDataSetsRepository(prisma)

        emailsRepository = new PrismaEmailsRepository(prisma)
    })

    beforeEach(async () => {
        const usersRepository = new PrismaUsersRepository(prisma)

        const user = {
            id: '1',
            name: 'Felyppe',
            email: 'felyppe@gmail.com',
            passwordHash: 'hashed-password',
        }

        await usersRepository.save(user)
    })

    it('should create an email successfully', async () => {
        const certificate = new Certificate(
            createCertificateData({
                template: new Template(createTemplateData()),
                dataSource: new DataSource(
                    createDataSourceData({
                        columns: ['column'],
                    }),
                ),
            }),
        )

        const dataSet = new DataSet(
            createDataSetData({
                generationStatus: GENERATION_STATUS.COMPLETED,
                totalBytes: 1000,
                rows: [{ column: 'felyppe@gmail.com' }],
            }),
        )

        const email = new Email(
            createEmailData({
                emailColumn: 'column',
            }),
        )

        await expect(
            (async () => {
                await certificateEmissionsRepository.save(certificate)
                await dataSetsRepository.save(dataSet)
                await emailsRepository.save(email)
            })(),
        ).resolves.not.toThrow()

        const createdEmail = await prisma.email.findUnique({
            where: { id: '1' },
        })

        expect(createdEmail).toEqual({
            id: '1',
            certificate_emission_id: '1',
            subject: 'Subject',
            body: 'Body',
            data_source_column_id: '1',
            email_column: 'column',
            scheduled_at: null,
            email_error_type: null,
            status: PROCESSING_STATUS_ENUM.RUNNING,
        })
    })

    it('should be able to delete a column that has an email related to it successfully', async () => {
        const certificate = new Certificate(
            createCertificateData({
                template: new Template(createTemplateData()),
                dataSource: new DataSource(
                    createDataSourceData({
                        columns: ['column'],
                    }),
                ),
            }),
        )

        const dataSet = new DataSet(
            createDataSetData({
                generationStatus: GENERATION_STATUS.COMPLETED,
                totalBytes: 1000,
                rows: [{ column: 'felyppe@gmail.com' }],
            }),
        )

        const email = new Email(
            createEmailData({
                emailColumn: 'column',
            }),
        )

        await expect(
            (async () => {
                await certificateEmissionsRepository.save(certificate)
                await dataSetsRepository.save(dataSet)
                await emailsRepository.save(email)
            })(),
        ).resolves.not.toThrow()

        certificate.setDataSource(
            createDataSourceData({ columns: ['another-column'] }),
        )
        dataSet.update({
            rows: [{ 'another-column': 'felyppe@gmail.com' }],
        })

        await expect(
            (async () => {
                await certificateEmissionsRepository.update(certificate)
                await dataSetsRepository.upsert(dataSet)
            })(),
        ).resolves.not.toThrow()

        const createdEmail = await prisma.email.findUnique({
            where: { id: '1' },
        })

        expect(createdEmail).toEqual({
            id: '1',
            certificate_emission_id: '1',
            subject: 'Subject',
            body: 'Body',
            data_source_column_id: null,
            email_column: null,
            scheduled_at: null,
            email_error_type: null,
            status: PROCESSING_STATUS_ENUM.RUNNING,
        })
    })
})
