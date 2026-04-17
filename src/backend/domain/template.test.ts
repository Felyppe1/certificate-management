import { describe, expect, it } from 'vitest'
import { INPUT_METHOD } from './certificate'
import { Template, TEMPLATE_FILE_MIME_TYPE, TemplateInput } from './template'

const createTemplateData = (
    overrides?: Partial<TemplateInput>,
): TemplateInput => ({
    fileMimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
    inputMethod: INPUT_METHOD.UPLOAD,
    driveFileId: null,
    storageFileUrl: 'https://storage-url',
    fileName: 'File Name',
    variables: [],
    thumbnailUrl: null,
    ...overrides,
})

describe('Template', () => {
    it('should allow creating a template with all required information', () => {
        const template = new Template(createTemplateData())

        expect(template.serialize()).toEqual({
            fileMimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
            inputMethod: INPUT_METHOD.UPLOAD,
            driveFileId: null,
            storageFileUrl: 'https://storage-url',
            fileName: 'File Name',
            variables: [],
            thumbnailUrl: null,
        })
    })

    it('should allow a template linked via Google Drive', () => {
        const template = new Template(
            createTemplateData({
                inputMethod: INPUT_METHOD.URL,
                driveFileId: 'drive-file-id',
            }),
        )

        expect(template.serialize()).toMatchObject({
            inputMethod: INPUT_METHOD.URL,
            driveFileId: 'drive-file-id',
            storageFileUrl: 'https://storage-url',
        })
    })

    it('should not have a Drive file ID if the input method is UPLOAD', () => {
        expect(
            () =>
                new Template(
                    createTemplateData({
                        inputMethod: INPUT_METHOD.UPLOAD,
                        driveFileId: '1',
                    }),
                ),
        ).toThrow(
            'Drive file ID should not be provided for UPLOAD input method',
        )
    })

    describe('template creation constraints', () => {
        it('should not allow template creation without an input method', () => {
            expect(
                () =>
                    new Template(
                        createTemplateData({
                            inputMethod: '' as INPUT_METHOD,
                        }),
                    ),
            ).toThrow('Template input method is required')
        })

        it('should not allow template creation without a file name', () => {
            expect(
                () =>
                    new Template(
                        createTemplateData({
                            fileName: '',
                        }),
                    ),
            ).toThrow('Template file name is required')
        })

        it('should not allow template creation without a file format', () => {
            expect(
                () =>
                    new Template(
                        createTemplateData({
                            fileMimeType: '' as TEMPLATE_FILE_MIME_TYPE,
                        }),
                    ),
            ).toThrow('Template file mimetype is required')
        })

        it("should not allow template creation without defined variables (even if it's empty)", () => {
            expect(
                () =>
                    new Template(
                        createTemplateData({
                            variables: undefined as any,
                        }),
                    ),
            ).toThrow('Template variables is required')
        })
    })

    describe('storage location update', () => {
        it('should update the storage location while preserving immutability', () => {
            const template = new Template(createTemplateData())
            const updated = template.setStorageFileUrl('https://new-url')

            expect(updated.getStorageFileUrl()).toBe('https://new-url')
            expect(template.getStorageFileUrl()).toBe('https://storage-url')
        })
    })

    describe('thumbnail update', () => {
        it('should update the thumbnail while preserving immutability', () => {
            const template = new Template(createTemplateData())
            const updated = template.setThumbnailUrl('https://thumbnail-url')

            expect(updated.serialize().thumbnailUrl).toBe(
                'https://thumbnail-url',
            )
            expect(template.serialize().thumbnailUrl).toBeNull()
        })
    })

    describe('template identity', () => {
        it('should be considered identical if all properties match', () => {
            const template1 = new Template(createTemplateData())
            const template2 = new Template(createTemplateData())

            expect(template1.equals(template2)).toBe(true)
        })

        it('should be considered different if any property differs', () => {
            const template1 = new Template(createTemplateData())
            const template2 = new Template(
                createTemplateData({ fileName: 'Different File Name' }),
            )

            expect(template1.equals(template2)).toBe(false)
        })
    })

    describe('Google Drive file ID identification', () => {
        it('should identify the id from a Google Drive link', () => {
            const url = 'https://drive.google.com/file/d/aA1-_/view'

            expect(Template.getFileIdFromUrl(url)).toBe('aA1-_')
        })

        it('should not identify the id from an unrecognized link', () => {
            const url = 'https://example.com/file'

            expect(Template.getFileIdFromUrl(url)).toBeNull()
        })
    })

    describe('supported file formats', () => {
        it('should accept Word, PowerPoint, Google Docs, and Google Slides files', () => {
            expect(
                Template.isValidFileMimeType(TEMPLATE_FILE_MIME_TYPE.DOCX),
            ).toBe(true)
            expect(
                Template.isValidFileMimeType(TEMPLATE_FILE_MIME_TYPE.PPTX),
            ).toBe(true)
            expect(
                Template.isValidFileMimeType(
                    TEMPLATE_FILE_MIME_TYPE.GOOGLE_DOCS,
                ),
            ).toBe(true)
            expect(
                Template.isValidFileMimeType(
                    TEMPLATE_FILE_MIME_TYPE.GOOGLE_SLIDES,
                ),
            ).toBe(true)
        })

        it('should reject unsupported file formats', () => {
            expect(Template.isValidFileMimeType('application/pdf')).toBe(false)
            expect(Template.isValidFileMimeType('')).toBe(false)
        })
    })
})
