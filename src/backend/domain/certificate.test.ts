import { describe, expect, it } from 'vitest'
import { Certificate } from './certificate'
import { Template, TEMPLATE_TYPE } from './template'

describe('Certificate', () => {
    it('should create a certificate successfully only with necessary data', () => {
        expect(
            () =>
                new Certificate({
                    id: '1',
                    title: 'Title',
                    userId: '1',
                    template: null,
                }),
        ).not.toThrow()
    })

    it('should add a template successfully', () => {
        const certificate = new Certificate({
            id: '1',
            title: 'Title',
            userId: '1',
            template: null,
        })

        expect(() => {
            certificate.addTemplate(
                new Template({
                    id: '1',
                    fileId: '1',
                    variables: [],
                    bucketUrl: null,
                    fileName: 'File Name',
                    type: TEMPLATE_TYPE.URL,
                }),
            )
        }).not.toThrow()

        expect(certificate.hasTemplate()).toBe(true)
        expect(certificate.getDomainEvents().length).toBe(1)
    })

    it('should remove a template successfully', () => {
        const certificate = new Certificate({
            id: '1',
            title: 'Title',
            userId: '1',
            template: new Template({
                id: '1',
                fileId: '1',
                variables: [],
                bucketUrl: null,
                fileName: 'File Name',
                type: TEMPLATE_TYPE.URL,
            }),
        })

        expect(certificate.hasTemplate()).toBe(true)

        certificate.removeTemplate()

        expect(certificate.hasTemplate()).toBe(false)
    })
})
