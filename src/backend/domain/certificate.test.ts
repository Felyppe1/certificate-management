import { describe, expect, it } from 'vitest'
import { Certificate, CERTIFICATE_STATUS } from './certificate'
import { Template, INPUT_METHOD, TEMPLATE_FILE_EXTENSION } from './template'

describe('Certificate', () => {
    it('should create a certificate emission successfully only with necessary data', () => {
        let certificate!: Certificate

        expect(
            () =>
                (certificate = Certificate.create({
                    name: 'Title',
                    userId: '1',
                    template: null,
                })),
        ).not.toThrow()

        const { domainEvents, ...serialized } = certificate.serialize()

        expect(serialized).toEqual({
            id: expect.any(String),
            name: 'Title',
            userId: '1',
            template: null,
            status: CERTIFICATE_STATUS.DRAFT,
            createdAt: expect.any(Date),
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
        })

        expect(() => {
            certificate.setTemplate(
                new Template({
                    id: '1',
                    fileExtension: TEMPLATE_FILE_EXTENSION.DOCX,
                    inputMethod: INPUT_METHOD.URL,
                    driveFileId: '1',
                    storageFileUrl: null,
                    fileName: 'File Name',
                    variables: [],
                }),
            )
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
            }),
            createdAt: new Date(),
            status: CERTIFICATE_STATUS.DRAFT,
        })

        expect(certificate.hasTemplate()).toBe(true)

        certificate.removeTemplate()

        expect(certificate.hasTemplate()).toBe(false)
    })
})
