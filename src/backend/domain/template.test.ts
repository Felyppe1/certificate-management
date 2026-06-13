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
    googleAccountEmail: null,
    ...overrides,
})

describe('Template', () => {
    it('deve permitir criar um template com todas as informações obrigatórias', () => {
        const template = new Template(createTemplateData())

        expect(template.serialize()).toEqual({
            fileMimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
            inputMethod: INPUT_METHOD.UPLOAD,
            driveFileId: null,
            storageFileUrl: 'https://storage-url',
            fileName: 'File Name',
            googleAccountEmail: null,
            variables: [],
            thumbnailUrl: null,
        })
    })

    it('deve permitir um template vinculado via Google Drive', () => {
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

    it('não deve ter ID de arquivo do Drive se o método de input é UPLOAD', () => {
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

    describe('restrições de criação de template', () => {
        it('não deve permitir criar template sem método de input', () => {
            expect(
                () =>
                    new Template(
                        createTemplateData({
                            inputMethod: '' as INPUT_METHOD,
                        }),
                    ),
            ).toThrow('Template input method is required')
        })

        it('não deve permitir criar template sem nome de arquivo', () => {
            expect(
                () =>
                    new Template(
                        createTemplateData({
                            fileName: '',
                        }),
                    ),
            ).toThrow('Template file name is required')
        })

        it('não deve permitir criar template sem formato de arquivo', () => {
            expect(
                () =>
                    new Template(
                        createTemplateData({
                            fileMimeType: '' as TEMPLATE_FILE_MIME_TYPE,
                        }),
                    ),
            ).toThrow('Template file mimetype is required')
        })

        it('não deve permitir criar template sem variáveis definidas (mesmo que vazia)', () => {
            expect(
                () =>
                    new Template(
                        createTemplateData({
                            variables: undefined as any,
                        }),
                    ),
            ).toThrow('Template variables is required')
        })

        it('não deve permitir criar template sem URL de armazenamento', () => {
            expect(
                () =>
                    new Template(
                        createTemplateData({
                            storageFileUrl: '',
                        }),
                    ),
            ).toThrow('Template storage file URL is required')
        })
    })

    describe('atualização da localização de armazenamento', () => {
        it('deve atualizar a localização de armazenamento preservando a imutabilidade', () => {
            const template = new Template(createTemplateData())
            const updated = template.setStorageFileUrl('https://new-url')

            expect(updated.getStorageFileUrl()).toBe('https://new-url')
            expect(template.getStorageFileUrl()).toBe('https://storage-url')
        })
    })

    describe('atualização da thumbnail', () => {
        it('deve atualizar a thumbnail preservando a imutabilidade', () => {
            const template = new Template(createTemplateData())
            const updated = template.setThumbnailUrl('https://thumbnail-url')

            expect(updated.serialize().thumbnailUrl).toBe(
                'https://thumbnail-url',
            )
            expect(template.serialize().thumbnailUrl).toBeNull()
        })
    })

    describe('identidade do template', () => {
        it('deve ser considerado idêntico se todas as propriedades forem iguais', () => {
            const template1 = new Template(createTemplateData())
            const template2 = new Template(createTemplateData())

            expect(template1.equals(template2)).toBe(true)
        })

        it('deve ser considerado diferente se alguma propriedade for diferente', () => {
            const template1 = new Template(createTemplateData())
            const template2 = new Template(
                createTemplateData({ fileName: 'Different File Name' }),
            )

            expect(template1.equals(template2)).toBe(false)
        })
    })

    describe('identificação do ID de arquivo do Google Drive', () => {
        it('deve identificar o ID a partir de um link do Google Drive', () => {
            const url = 'https://drive.google.com/file/d/aA1-_/view'

            expect(Template.getFileIdFromUrl(url)).toBe('aA1-_')
        })

        it('não deve identificar o ID a partir de um link não reconhecido', () => {
            const url = 'https://example.com/file'

            expect(Template.getFileIdFromUrl(url)).toBeNull()
        })
    })

    describe('formatos de arquivo suportados', () => {
        it('deve aceitar arquivos Word, PowerPoint, Google Docs e Google Slides', () => {
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

        it('deve rejeitar formatos de arquivo não suportados', () => {
            expect(Template.isValidFileMimeType('application/pdf')).toBe(false)
            expect(Template.isValidFileMimeType('')).toBe(false)
        })
    })
})