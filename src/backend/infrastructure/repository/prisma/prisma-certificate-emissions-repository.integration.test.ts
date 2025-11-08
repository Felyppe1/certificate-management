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

const createTemplateData = (
    overrides?: Partial<TemplateInput>,
): TemplateInput => ({
    id: '1',
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
    id: '1',
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

describe('PrismaCertificateEmissionsRepository Integration Tests', () => {
    let certificateEmissionsRepository: PrismaCertificatesRepository

    beforeAll(() => {
        certificateEmissionsRepository = new PrismaCertificatesRepository(
            prisma,
        )
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

    it('should create a certificate emission successfully', async () => {
        const certificate = new Certificate(createCertificateData())

        await expect(
            certificateEmissionsRepository.save(certificate),
        ).resolves.not.toThrow()

        const createdCertificate = await prisma.certificateEmission.findUnique({
            where: { id: '1' },
        })

        expect(createdCertificate).toEqual({
            id: '1',
            title: 'Certificate Name',
            user_id: '1',
            status: CERTIFICATE_STATUS.DRAFT,
            created_at: expect.any(Date),
        })
    })

    it('should add a template successfully', async () => {
        const certificate = new Certificate(createCertificateData())

        await certificateEmissionsRepository.save(certificate)

        certificate.setTemplate(createTemplateData())

        await expect(
            certificateEmissionsRepository.update(certificate),
        ).resolves.not.toThrow()

        const createdTemplate = await prisma.template.findUnique({
            where: { certificate_emission_id: '1' },
        })

        expect(createdTemplate).toEqual({
            id: expect.any(String),
            certificate_emission_id: '1',
            file_extension: TEMPLATE_FILE_EXTENSION.DOCX,
            input_method: INPUT_METHOD.URL,
            drive_file_id: '1',
            storage_file_url: null,
            file_name: 'File Name',
            thumbnail_url: null,
        })
    })

    it('should remove a template successfully', async () => {
        const certificate = new Certificate(
            createCertificateData({
                template: new Template(createTemplateData()),
            }),
        )

        await certificateEmissionsRepository.save(certificate)

        certificate.removeTemplate('1')

        await expect(
            certificateEmissionsRepository.update(certificate),
        ).resolves.not.toThrow()

        const removedTemplate = await prisma.template.findUnique({
            where: { certificate_emission_id: '1' },
        })

        expect(removedTemplate).toBeNull()
    })

    it('should add a data source successfully', async () => {
        const certificate = new Certificate(createCertificateData())

        await certificateEmissionsRepository.save(certificate)

        certificate.setDataSource(createDataSourceData())

        await expect(
            certificateEmissionsRepository.update(certificate),
        ).resolves.not.toThrow()

        const createdDataSource = await prisma.dataSource.findUnique({
            where: { certificate_emission_id: '1' },
        })

        expect(createdDataSource).toEqual({
            id: expect.any(String),
            certificate_emission_id: '1',
            file_extension: DATA_SOURCE_FILE_EXTENSION.CSV,
            input_method: INPUT_METHOD.URL,
            drive_file_id: '1',
            storage_file_url: null,
            file_name: 'File Name',
            thumbnail_url: null,
        })
    })

    it('should remove a data source successfully', async () => {
        const certificate = new Certificate(
            createCertificateData({
                dataSource: new DataSource(createDataSourceData()),
            }),
        )

        await certificateEmissionsRepository.save(certificate)

        certificate.removeDataSource('1')

        await expect(
            certificateEmissionsRepository.update(certificate),
        ).resolves.not.toThrow()

        const removedDataSource = await prisma.dataSource.findUnique({
            where: { certificate_emission_id: '1' },
        })

        expect(removedDataSource).toBeNull()
    })

    describe('should preserve existing mapping and try to auto-map new variables with columns that are not being used when updating the', () => {
        it('template', async () => {
            const certificate = new Certificate(
                createCertificateData({
                    template: new Template(
                        createTemplateData({ variables: ['variable1'] }),
                    ),
                    dataSource: new DataSource(
                        createDataSourceData({
                            columns: ['column1', 'column2'],
                        }),
                    ),
                    variableColumnMapping: {
                        variable1: 'column1',
                    },
                }),
            )

            await expect(
                certificateEmissionsRepository.save(certificate),
            ).resolves.not.toThrow()

            certificate.updateTemplate({
                variables: ['variable1', 'column1', 'column2'],
            })

            await expect(
                certificateEmissionsRepository.update(certificate),
            ).resolves.not.toThrow()

            const updatedCertificate =
                await prisma.certificateEmission.findUnique({
                    where: { id: '1' },
                    include: {
                        Template: {
                            include: {
                                TemplateVariable: true,
                            },
                        },
                    },
                })

            expect(updatedCertificate?.Template?.TemplateVariable).toEqual([
                {
                    template_id: '1',
                    name: 'variable1',
                    data_source_id: '1',
                    data_source_name: 'column1',
                },
                {
                    template_id: '1',
                    name: 'column1',
                    data_source_id: null,
                    data_source_name: null,
                },
                {
                    template_id: '1',
                    name: 'column2',
                    data_source_id: '1',
                    data_source_name: 'column2',
                },
            ])
        })

        it('data source', async () => {
            const certificate = new Certificate(
                createCertificateData({
                    template: new Template(
                        createTemplateData({
                            variables: ['variable1', 'column2'],
                        }),
                    ),
                    dataSource: new DataSource(
                        createDataSourceData({ columns: ['column1'] }),
                    ),
                    variableColumnMapping: {
                        variable1: 'column1',
                        column2: null,
                    },
                }),
            )

            await expect(
                certificateEmissionsRepository.save(certificate),
            ).resolves.not.toThrow()

            certificate.updateDataSource({
                columns: ['column3', 'column2', 'column1'],
            })

            await expect(
                certificateEmissionsRepository.update(certificate),
            ).resolves.not.toThrow()

            const updatedCertificate =
                await prisma.certificateEmission.findUnique({
                    where: { id: '1' },
                    include: {
                        Template: {
                            include: {
                                TemplateVariable: true,
                            },
                        },
                        DataSource: {
                            include: {
                                DataSourceColumn: true,
                            },
                        },
                    },
                })

            expect(updatedCertificate?.Template?.TemplateVariable).toEqual([
                {
                    template_id: '1',
                    name: 'variable1',
                    data_source_id: '1',
                    data_source_name: 'column1',
                },
                {
                    template_id: '1',
                    name: 'column2',
                    data_source_id: '1',
                    data_source_name: 'column2',
                },
            ])

            expect(updatedCertificate?.DataSource?.DataSourceColumn).toEqual([
                {
                    data_source_id: '1',
                    name: 'column3',
                },
                {
                    data_source_id: '1',
                    name: 'column2',
                },
                {
                    data_source_id: '1',
                    name: 'column1',
                },
            ])
        })
    })
})
