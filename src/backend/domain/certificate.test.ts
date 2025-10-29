import { describe, expect, it } from 'vitest'
import { Certificate, CERTIFICATE_STATUS } from './certificate'
import { Template, INPUT_METHOD, TEMPLATE_FILE_EXTENSION } from './template'
import { DATA_SOURCE_FILE_EXTENSION, DataSource } from './data-source'

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
        const certificate = new Certificate({
            id: '1',
            name: 'Name',
            userId: '1',
            template: null,
            createdAt: new Date(),
            status: CERTIFICATE_STATUS.DRAFT,
            dataSource: null,
            variableColumnMapping: null,
        })

        expect(() => {
            certificate.setTemplate({
                fileExtension: TEMPLATE_FILE_EXTENSION.DOCX,
                inputMethod: INPUT_METHOD.URL,
                driveFileId: '1',
                storageFileUrl: null,
                fileName: 'File Name',
                variables: [],
                thumbnailUrl: null,
            })
        }).not.toThrow()

        expect(certificate.hasTemplate()).toBe(true)
        expect(certificate.getDomainEvents().length).toBe(1)
    })

    it('should remove a template successfully', () => {
        const certificate = new Certificate({
            id: '1',
            name: 'Name',
            userId: '1',
            template: new Template({
                id: '1',
                fileExtension: TEMPLATE_FILE_EXTENSION.DOCX,
                inputMethod: INPUT_METHOD.URL,
                driveFileId: '1',
                storageFileUrl: null,
                fileName: 'File Name',
                variables: [],
                thumbnailUrl: null,
            }),
            createdAt: new Date(),
            status: CERTIFICATE_STATUS.DRAFT,
            dataSource: null,
            variableColumnMapping: null,
        })

        expect(certificate.hasTemplate()).toBe(true)

        certificate.removeTemplate('1')

        expect(certificate.hasTemplate()).toBe(false)
    })

    it('should add a data source successfully', () => {
        const certificate = new Certificate({
            id: '1',
            name: 'Name',
            userId: '1',
            template: null,
            createdAt: new Date(),
            status: CERTIFICATE_STATUS.DRAFT,
            dataSource: null,
            variableColumnMapping: null,
        })

        expect(() => {
            certificate.setDataSource({
                fileExtension: DATA_SOURCE_FILE_EXTENSION.CSV,
                inputMethod: INPUT_METHOD.URL,
                driveFileId: '1',
                storageFileUrl: null,
                fileName: 'File Name',
                columns: ['column1'],
                thumbnailUrl: null,
            })
        }).not.toThrow()

        expect(certificate.hasDataSource()).toBe(true)
        expect(certificate.getDomainEvents().length).toBe(1)
    })

    it('should remove a data source successfully', () => {
        const certificate = new Certificate({
            id: '1',
            name: 'Name',
            userId: '1',
            template: null,
            createdAt: new Date(),
            status: CERTIFICATE_STATUS.DRAFT,
            dataSource: new DataSource({
                id: '1',
                fileExtension: DATA_SOURCE_FILE_EXTENSION.CSV,
                inputMethod: INPUT_METHOD.URL,
                driveFileId: '1',
                storageFileUrl: null,
                fileName: 'File Name',
                columns: ['column1'],
                thumbnailUrl: null,
            }),
            variableColumnMapping: null,
        })

        expect(certificate.hasDataSource()).toBe(true)

        certificate.removeDataSource('1')

        expect(certificate.hasDataSource()).toBe(false)
    })

    describe('should preserve existing mapping and try to auto-map new variables with columns that are not being used when updating the', () => {
        it('template', () => {
            const certificate = new Certificate({
                id: '1',
                name: 'Name',
                userId: '1',
                template: new Template({
                    id: '1',
                    fileExtension: TEMPLATE_FILE_EXTENSION.DOCX,
                    inputMethod: INPUT_METHOD.URL,
                    driveFileId: '1',
                    storageFileUrl: null,
                    fileName: 'File Name',
                    variables: ['variable1'],
                    thumbnailUrl: null,
                }),
                createdAt: new Date(),
                status: CERTIFICATE_STATUS.DRAFT,
                dataSource: new DataSource({
                    id: '1',
                    fileExtension: DATA_SOURCE_FILE_EXTENSION.CSV,
                    inputMethod: INPUT_METHOD.URL,
                    driveFileId: '1',
                    storageFileUrl: null,
                    fileName: 'File Name',
                    columns: ['column1', 'column2'],
                    thumbnailUrl: null,
                }),
                variableColumnMapping: {
                    variable1: 'column1',
                },
            })

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
            const certificate = new Certificate({
                id: '1',
                name: 'Name',
                userId: '1',
                template: new Template({
                    id: '1',
                    fileExtension: TEMPLATE_FILE_EXTENSION.DOCX,
                    inputMethod: INPUT_METHOD.URL,
                    driveFileId: '1',
                    storageFileUrl: null,
                    fileName: 'File Name',
                    variables: ['variable1', 'column2'],
                    thumbnailUrl: null,
                }),
                createdAt: new Date(),
                status: CERTIFICATE_STATUS.DRAFT,
                dataSource: new DataSource({
                    id: '1',
                    fileExtension: DATA_SOURCE_FILE_EXTENSION.CSV,
                    inputMethod: INPUT_METHOD.URL,
                    driveFileId: '1',
                    storageFileUrl: null,
                    fileName: 'File Name',
                    columns: ['column1'],
                    thumbnailUrl: null,
                }),
                variableColumnMapping: {
                    variable1: 'column1',
                    column2: null,
                },
            })

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
            const certificate = new Certificate({
                id: '1',
                name: 'Name',
                userId: '1',
                template: null,
                createdAt: new Date(),
                status: CERTIFICATE_STATUS.DRAFT,
                dataSource: new DataSource({
                    id: '1',
                    fileExtension: DATA_SOURCE_FILE_EXTENSION.CSV,
                    inputMethod: INPUT_METHOD.URL,
                    driveFileId: '1',
                    storageFileUrl: null,
                    fileName: 'File Name',
                    columns: ['Name', 'E-mail'],
                    thumbnailUrl: null,
                }),
                variableColumnMapping: null,
            })

            certificate.setTemplate({
                fileExtension: TEMPLATE_FILE_EXTENSION.DOCX,
                inputMethod: INPUT_METHOD.URL,
                driveFileId: '1',
                storageFileUrl: null,
                fileName: 'File Name',
                variables: ['name', 'random', 'email'],
                thumbnailUrl: null,
            })

            const { variableColumnMapping } = certificate.serialize()

            expect(variableColumnMapping).toEqual({
                email: 'E-mail',
                name: 'Name',
                random: null,
            })
        })

        it('data source', () => {
            const certificate = new Certificate({
                id: '1',
                name: 'Name',
                userId: '1',
                template: new Template({
                    id: '1',
                    fileExtension: TEMPLATE_FILE_EXTENSION.DOCX,
                    inputMethod: INPUT_METHOD.URL,
                    driveFileId: '1',
                    storageFileUrl: null,
                    fileName: 'File Name',
                    variables: ['name', 'random', 'email'],
                    thumbnailUrl: null,
                }),
                createdAt: new Date(),
                status: CERTIFICATE_STATUS.DRAFT,
                dataSource: null,
                variableColumnMapping: {
                    name: null,
                    random: null,
                    email: null,
                },
            })

            certificate.setDataSource({
                fileExtension: DATA_SOURCE_FILE_EXTENSION.CSV,
                inputMethod: INPUT_METHOD.URL,
                driveFileId: '1',
                storageFileUrl: null,
                fileName: 'File Name',
                columns: ['Name', 'E-mail'],
                thumbnailUrl: null,
            })

            const { variableColumnMapping } = certificate.serialize()

            expect(variableColumnMapping).toEqual({
                email: 'E-mail',
                name: 'Name',
                random: null,
            })
        })
    })
})
