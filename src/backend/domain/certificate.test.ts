import { describe, expect, it } from 'vitest'
import {
    Certificate,
    CERTIFICATE_STATUS,
    CertificateInput,
    INPUT_METHOD,
} from './certificate'
import { Template, TEMPLATE_FILE_EXTENSION, TemplateInput } from './template'
import {
    DATA_SOURCE_FILE_EXTENSION,
    DataSource,
    DataSourceInput,
} from './data-source'

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
    name: 'Name',
    userId: '1',
    template: null,
    createdAt: new Date(),
    status: CERTIFICATE_STATUS.DRAFT,
    dataSource: null,
    variableColumnMapping: null,
    ...overrides,
})

describe('Certificate', () => {
    it('should create a certificate emission successfully only with necessary data', () => {
        let certificate!: Certificate

        expect(
            () =>
                (certificate = Certificate.create({
                    name: 'Title',
                    userId: '1',
                    template: null,
                    dataSource: null,
                })),
        ).not.toThrow()

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { domainEvents, ...serialized } = certificate.serialize()

        expect(serialized).toEqual({
            id: expect.any(String),
            name: 'Title',
            userId: '1',
            template: null,
            status: CERTIFICATE_STATUS.DRAFT,
            createdAt: expect.any(Date),
            dataSource: null,
            variableColumnMapping: null,
        })

        const {} = certificate.serialize()
    })

    it('should add a template successfully', () => {
        const certificate = new Certificate(createCertificateData())

        expect(() => {
            certificate.setTemplate(createTemplateData())
        }).not.toThrow()

        expect(certificate.hasTemplate()).toBe(true)
        expect(certificate.getDomainEvents().length).toBe(1)
    })

    it('should remove a template successfully', () => {
        const certificate = new Certificate(
            createCertificateData({
                template: new Template(createTemplateData()),
            }),
        )

        expect(certificate.hasTemplate()).toBe(true)

        certificate.removeTemplate('1')

        expect(certificate.hasTemplate()).toBe(false)
    })

    it('should add a data source successfully', () => {
        const certificate = new Certificate(createCertificateData())

        expect(() => {
            certificate.setDataSource(
                createDataSourceData({
                    columns: ['column1'],
                }),
            )
        }).not.toThrow()

        expect(certificate.hasDataSource()).toBe(true)
        expect(certificate.getDomainEvents().length).toBe(1)
    })

    it('should remove a data source successfully', () => {
        const certificate = new Certificate(
            createCertificateData({
                dataSource: new DataSource(createDataSourceData()),
            }),
        )

        expect(certificate.hasDataSource()).toBe(true)

        certificate.removeDataSource('1')

        expect(certificate.hasDataSource()).toBe(false)
    })

    describe('should preserve existing mapping and try to auto-map new variables with columns that are not being used when updating the', () => {
        it('template', () => {
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

            certificate.updateTemplate({
                variables: ['variable1', 'column1', 'column2'],
            })

            const { variableColumnMapping } = certificate.serialize()

            expect(variableColumnMapping).toEqual({
                variable1: 'column1',
                column1: null,
                column2: 'column2',
            })
        })

        it('data source', () => {
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

            certificate.updateDataSource({
                columns: ['column3', 'column2', 'column1'],
            })

            const { variableColumnMapping } = certificate.serialize()

            expect(variableColumnMapping).toEqual({
                variable1: 'column1',
                column2: 'column2',
            })
        })
    })

    describe('should automatically map variables to columns with matching normalized names when adding a new', () => {
        it('template', () => {
            const certificate = new Certificate(
                createCertificateData({
                    dataSource: new DataSource(
                        createDataSourceData({ columns: ['Name', 'E-mail'] }),
                    ),
                }),
            )

            certificate.setTemplate(
                createTemplateData({
                    variables: ['name', 'random', 'email'],
                }),
            )

            const { variableColumnMapping } = certificate.serialize()

            expect(variableColumnMapping).toEqual({
                email: 'E-mail',
                name: 'Name',
                random: null,
            })
        })

        it('data source', () => {
            const certificate = new Certificate(
                createCertificateData({
                    template: new Template(
                        createTemplateData({
                            variables: ['name', 'random', 'email'],
                        }),
                    ),
                    variableColumnMapping: {
                        name: null,
                        random: null,
                        email: null,
                    },
                }),
            )

            certificate.setDataSource(
                createDataSourceData({
                    columns: ['Name', 'E-mail'],
                }),
            )

            const { variableColumnMapping } = certificate.serialize()

            expect(variableColumnMapping).toEqual({
                email: 'E-mail',
                name: 'Name',
                random: null,
            })
        })
    })
})
