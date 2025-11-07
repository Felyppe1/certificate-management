import { describe, expect, it } from 'vitest'
import { INPUT_METHOD } from './certificate'
import { Template, TEMPLATE_FILE_EXTENSION, TemplateInput } from './template'

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

describe('Template', () => {
    it('should create a template successfully only with necessary data', () => {
        let template!: Template

        expect(
            () => (template = Template.create(createTemplateData())),
        ).not.toThrow()

        const serialized = template.serialize()

        expect(serialized).toEqual({
            id: expect.any(String),
            fileExtension: TEMPLATE_FILE_EXTENSION.DOCX,
            inputMethod: INPUT_METHOD.URL,
            driveFileId: '1',
            storageFileUrl: null,
            fileName: 'File Name',
            variables: [],
            thumbnailUrl: null,
        })
    })

    it('should not add a storage URL if the input method is not UPLOAD', () => {
        expect(
            () =>
                new Template(
                    createTemplateData({
                        inputMethod: INPUT_METHOD.URL,
                        storageFileUrl: 'http://storage-url',
                    }),
                ),
        ).toThrow(
            'File storage URL should only be provided for UPLOAD input method',
        )
    })

    it('should not add a Drive file ID if the input method is UPLOAD', () => {
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

    it('should throw validation error when required data is missing', () => {
        expect(
            () =>
                new Template(
                    createTemplateData({
                        id: '',
                    }),
                ),
        ).toThrow('Template ID is required')
    })

    describe('extractVariablesFromContent', () => {
        it('should extract variables within double curly braces', () => {
            const content = '{{alltogether}} {{ space }} {{    leftspace}}'
            const variables = Template.extractVariablesFromContent(content)

            expect(variables).toEqual(['alltogether', 'space', 'leftspace'])
        })

        it('should extract variables with allowed characters', () => {
            const content = '{{ Variable1._- }}'
            const variables = Template.extractVariablesFromContent(content)

            expect(variables).toEqual(['Variable1._-'])
        })

        it('should not extract invalid variables', () => {
            const content = '{{ vari able }} {{ vari@able }}'
            const variables = Template.extractVariablesFromContent(content)

            expect(variables).toEqual([])
        })

        it('should remove duplicate variables', () => {
            const content = '{{ name }} {{ name }}'
            const variables = Template.extractVariablesFromContent(content)

            expect(variables).toEqual(['name'])
            expect(variables).toHaveLength(1)
        })

        it('should return empty array when no variables are found', () => {
            const content = 'Hello World!'
            const variables = Template.extractVariablesFromContent(content)

            expect(variables).toEqual([])
        })

        it('should handle empty content string', () => {
            const content = ''
            const variables = Template.extractVariablesFromContent(content)

            expect(variables).toEqual([])
        })

        it('should handle variables with underscores', () => {
            const content =
                'Hello {{ user_name }}, your {{ company_id }} is active'
            const variables = Template.extractVariablesFromContent(content)

            expect(variables).toEqual(['user_name', 'company_id'])
        })
    })
})
