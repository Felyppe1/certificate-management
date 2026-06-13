import { describe, expect, it } from 'vitest'
import {
    DataSource,
    DataSourceInput,
    CreateDataSourceInput,
    DATA_SOURCE_MIME_TYPE,
    MAX_DATA_SOURCE_ROWS,
    MAX_DATA_SOURCE_COLUMNS,
    MAX_IMAGE_FILES,
} from './data-source'
import { INPUT_METHOD } from './certificate'
import { DataSourceImageFilesExceededError } from './error/validation-error/data-source-image-files-exceeded-error'
import { DataSourceColumnsExceededError } from './error/validation-error/data-source-columns-exceeded-error'
import { DataSourceRowsExceededError } from './error/validation-error/data-source-rows-exceeded-error'
import { DataSourceColumnsNotFoundError } from './error/validation-error/data-source-columns-not-found-error'
import { DataSourceColumnTypeChangeNotAllowedError } from './error/validation-error/data-source-column-type-change-not-allowed-error'
import { DataSourceNotImageError } from './error/validation-error/data-source-not-image-error'

const makeFile = (overrides = {}) => ({
    fileName: 'dados.csv',
    driveFileId: null,
    storageFileUrl: 'https://storage.example.com/dados.csv',
    ...overrides,
})

const makeColumn = (
    name: string,
    type: 'string' | 'number' | 'boolean' | 'date' | 'array' = 'string',
) => ({
    name,
    type,
    arrayMetadata: null,
})

const makeDataSourceInput = (
    overrides: Partial<DataSourceInput> = {},
): DataSourceInput => ({
    files: [makeFile()],
    inputMethod: INPUT_METHOD.UPLOAD,
    fileMimeType: DATA_SOURCE_MIME_TYPE.CSV,
    thumbnailUrl: null,
    columnsRow: 1,
    dataRowStart: 2,
    columns: [makeColumn('Nome'), makeColumn('Email')],
    googleAccountEmail: null,
    ...overrides,
})

const makeCreateInput = (
    overrides: Partial<CreateDataSourceInput> = {},
): CreateDataSourceInput => ({
    files: [makeFile()],
    inputMethod: INPUT_METHOD.UPLOAD,
    fileMimeType: DATA_SOURCE_MIME_TYPE.CSV,
    thumbnailUrl: null,
    columnsRow: 1,
    dataRowStart: 2,
    columns: ['Nome', 'Email'],
    rows: [{ Nome: 'João', Email: 'joao@email.com' }],
    googleAccountEmail: null,
    ...overrides,
})

describe('Fonte de dados', () => {
    describe('Regras obrigatórias para cadastro', () => {
        it('deve exigir o método de importação da planilha', () => {
            expect(
                () =>
                    new DataSource(
                        makeDataSourceInput({
                            inputMethod: '' as INPUT_METHOD,
                        }),
                    ),
            ).toThrow('DataSource input method is required')
        })

        it('deve exigir pelo menos um arquivo vinculado', () => {
            expect(
                () => new DataSource(makeDataSourceInput({ files: [] })),
            ).toThrow('DataSource files are required')
        })

        it('deve exigir o formato do arquivo', () => {
            expect(
                () =>
                    new DataSource(
                        makeDataSourceInput({
                            fileMimeType: '' as DATA_SOURCE_MIME_TYPE,
                        }),
                    ),
            ).toThrow('DataSource mimetype is required')
        })

        it('deve exigir a linha onde estão os cabeçalhos da planilha', () => {
            expect(
                () =>
                    new DataSource(
                        makeDataSourceInput({ columnsRow: undefined }),
                    ),
            ).toThrow('DataSource columns row is required')
        })

        it('deve exigir a linha inicial dos dados', () => {
            expect(
                () =>
                    new DataSource(
                        makeDataSourceInput({ dataRowStart: undefined }),
                    ),
            ).toThrow('DataSource data row start is required')
        })

        it('deve lançar erro quando a linha de cabeçalhos for negativa', () => {
            expect(
                () =>
                    new DataSource(
                        makeDataSourceInput({
                            columnsRow: -1,
                            dataRowStart: 2,
                        }),
                    ),
            ).toThrow('DataSource columns row must be positive')
        })

        it('deve lançar erro quando a linha inicial dos dados for negativa', () => {
            expect(
                () =>
                    new DataSource(
                        makeDataSourceInput({
                            columnsRow: 1,
                            dataRowStart: -1,
                        }),
                    ),
            ).toThrow('DataSource data row start must be positive')
        })

        it('deve aceitar linha de cabeçalhos no valor zero com sucesso', () => {
            expect(
                () =>
                    new DataSource(
                        makeDataSourceInput({ columnsRow: 0, dataRowStart: 1 }),
                    ),
            ).not.toThrow()
        })

        it('deve exigir que os dados comecem após a linha de cabeçalhos', () => {
            expect(
                () =>
                    new DataSource(
                        makeDataSourceInput({ columnsRow: 2, dataRowStart: 2 }),
                    ),
            ).toThrow(
                'DataSource data row start must be greater than columns row',
            )
        })

        it('deve exigir ao menos uma coluna cadastrada', () => {
            expect(
                () => new DataSource(makeDataSourceInput({ columns: [] })),
            ).toThrow('DataSource columns is required')
        })

        it('deve impedir o cadastro de mais imagens do que o limite permitido', () => {
            const imageFiles = Array.from(
                { length: MAX_IMAGE_FILES + 1 },
                (_, i) =>
                    makeFile({
                        fileName: `foto${i}.png`,
                        storageFileUrl: `https://storage.example.com/foto${i}.png`,
                    }),
            )

            expect(
                () =>
                    new DataSource(
                        makeDataSourceInput({
                            files: imageFiles,
                            fileMimeType: DATA_SOURCE_MIME_TYPE.PNG,
                            columns: [makeColumn('Foto')],
                        }),
                    ),
            ).toThrow(DataSourceImageFilesExceededError)
        })

        it('deve impedir o cadastro de mais de um arquivo para planilhas', () => {
            expect(
                () =>
                    new DataSource(
                        makeDataSourceInput({
                            files: [
                                makeFile(),
                                makeFile({
                                    fileName: 'dados2.csv',
                                    storageFileUrl:
                                        'https://storage.example.com/dados2.csv',
                                }),
                            ],
                        }),
                    ),
            ).toThrow(DataSourceImageFilesExceededError)
        })

        it('deve aceitar o número máximo de imagens permitido com sucesso', () => {
            const imageFiles = Array.from({ length: MAX_IMAGE_FILES }, (_, i) =>
                makeFile({
                    fileName: `foto${i}.png`,
                    storageFileUrl: `https://storage.example.com/foto${i}.png`,
                }),
            )

            expect(
                () =>
                    new DataSource(
                        makeDataSourceInput({
                            files: imageFiles,
                            fileMimeType: DATA_SOURCE_MIME_TYPE.PNG,
                            columns: [makeColumn('Foto')],
                        }),
                    ),
            ).not.toThrow()
        })

        it('deve aceitar um número de imagens abaixo do limite máximo com sucesso', () => {
            const imageFiles = Array.from(
                { length: MAX_IMAGE_FILES - 1 },
                (_, i) =>
                    makeFile({
                        fileName: `foto${i}.png`,
                        storageFileUrl: `https://storage.example.com/foto${i}.png`,
                    }),
            )

            expect(
                () =>
                    new DataSource(
                        makeDataSourceInput({
                            files: imageFiles,
                            fileMimeType: DATA_SOURCE_MIME_TYPE.PNG,
                            columns: [makeColumn('Foto')],
                        }),
                    ),
            ).not.toThrow()
        })
    })

    describe('Criação com inferência de tipos das colunas', () => {
        it('deve identificar automaticamente os tipos das colunas com base nos dados informados', () => {
            const dataSource = DataSource.create(makeCreateInput())

            expect(dataSource.getColumns()).toHaveLength(2)
        })

        it('deve impedir a criação quando o número de colunas ultrapassar o limite permitido', () => {
            const columns = Array.from(
                { length: MAX_DATA_SOURCE_COLUMNS + 1 },
                (_, i) => `Coluna${i}`,
            )
            const rows = [Object.fromEntries(columns.map(c => [c, 'valor']))]

            expect(() =>
                DataSource.create(makeCreateInput({ columns, rows })),
            ).toThrow(DataSourceColumnsExceededError)
        })

        it('deve impedir a criação quando o número de linhas ultrapassar o limite permitido', () => {
            const rows = Array.from(
                { length: MAX_DATA_SOURCE_ROWS + 1 },
                () => ({
                    Nome: 'João',
                    Email: 'joao@email.com',
                }),
            )

            expect(() => DataSource.create(makeCreateInput({ rows }))).toThrow(
                DataSourceRowsExceededError,
            )
        })

        it('deve impedir a criação quando os dados contiverem colunas não declaradas no cabeçalho', () => {
            const rows = [
                { Nome: 'João', Email: 'joao@email.com', ColunaExtra: 'valor' },
            ]

            expect(() => DataSource.create(makeCreateInput({ rows }))).toThrow(
                DataSourceColumnsNotFoundError,
            )
        })

        it('deve definir todas as colunas como texto quando não há dados para inferência', () => {
            const dataSource = DataSource.create(makeCreateInput({ rows: [] }))

            dataSource.getColumns().forEach(col => {
                expect(col.type).toBe('string')
            })
        })

        it('deve criar com sucesso quando o número de linhas estiver no limite máximo', () => {
            const rows = Array.from({ length: MAX_DATA_SOURCE_ROWS }, () => ({
                Nome: 'João',
                Email: 'joao@email.com',
            }))

            expect(() =>
                DataSource.create(makeCreateInput({ rows })),
            ).not.toThrow()
        })

        it('deve criar com sucesso quando o número de linhas estiver abaixo do limite máximo', () => {
            const rows = Array.from(
                { length: MAX_DATA_SOURCE_ROWS - 1 },
                () => ({ Nome: 'João', Email: 'joao@email.com' }),
            )

            expect(() =>
                DataSource.create(makeCreateInput({ rows })),
            ).not.toThrow()
        })

        it('deve criar com sucesso quando o número de colunas estiver no limite máximo', () => {
            const columns = Array.from(
                { length: MAX_DATA_SOURCE_COLUMNS },
                (_, i) => `Coluna${i}`,
            )
            const rows = [Object.fromEntries(columns.map(c => [c, 'valor']))]

            expect(() =>
                DataSource.create(makeCreateInput({ columns, rows })),
            ).not.toThrow()
        })

        it('deve criar com sucesso quando o número de colunas estiver abaixo do limite máximo', () => {
            const columns = Array.from(
                { length: MAX_DATA_SOURCE_COLUMNS - 1 },
                (_, i) => `Coluna${i}`,
            )
            const rows = [Object.fromEntries(columns.map(c => [c, 'valor']))]

            expect(() =>
                DataSource.create(makeCreateInput({ columns, rows })),
            ).not.toThrow()
        })
    })

    describe('Alteração dos tipos de colunas', () => {
        it('deve impedir a alteração para uma coluna que não existe na fonte de dados', () => {
            const dataSource = new DataSource(makeDataSourceInput())

            expect(() =>
                dataSource.setColumns([
                    {
                        name: 'ColunaInexistente',
                        type: 'string',
                        arrayMetadata: null,
                    },
                ]),
            ).toThrow(DataSourceColumnsNotFoundError)
        })

        it('deve impedir a conversão de número para booleano por ser incompatível', () => {
            const dataSource = new DataSource(
                makeDataSourceInput({
                    columns: [makeColumn('Quantidade', 'number')],
                }),
            )

            expect(() =>
                dataSource.setColumns([
                    {
                        name: 'Quantidade',
                        type: 'boolean',
                        arrayMetadata: null,
                    },
                ]),
            ).toThrow(DataSourceColumnTypeChangeNotAllowedError)
        })

        it('deve impedir a conversão de booleano para data por ser incompatível', () => {
            const dataSource = new DataSource(
                makeDataSourceInput({
                    columns: [makeColumn('Ativo', 'boolean')],
                }),
            )

            expect(() =>
                dataSource.setColumns([
                    { name: 'Ativo', type: 'date', arrayMetadata: null },
                ]),
            ).toThrow(DataSourceColumnTypeChangeNotAllowedError)
        })

        it('deve avisar quando a conversão de texto para número pode causar perda de dados', () => {
            const dataSource = new DataSource(
                makeDataSourceInput({
                    columns: [makeColumn('Valor', 'string')],
                }),
            )

            const { unsafeColumnNames } = dataSource.setColumns([
                { name: 'Valor', type: 'number', arrayMetadata: null },
            ])

            expect(unsafeColumnNames).toContain('Valor')
        })

        it('deve permitir alteração de tipo compatível sem avisos', () => {
            const dataSource = new DataSource(makeDataSourceInput())

            const { unsafeColumnNames } = dataSource.setColumns([
                { name: 'Nome', type: 'string', arrayMetadata: null },
                { name: 'Email', type: 'string', arrayMetadata: null },
            ])

            expect(unsafeColumnNames).toHaveLength(0)
        })
    })

    describe('Localização de armazenamento', () => {
        it('deve atualizar a localização de armazenamento do primeiro arquivo preservando a imutabilidade', () => {
            const dataSource = new DataSource(makeDataSourceInput())
            const updated = dataSource.setStorageFileUrl(
                'https://nova-url.com/dados.csv',
            )

            expect(updated.getStorageFileUrl()).toBe(
                'https://nova-url.com/dados.csv',
            )
            expect(dataSource.getStorageFileUrl()).toBe(
                'https://storage.example.com/dados.csv',
            )
        })

        it('deve atualizar as localizações de múltiplos arquivos preservando a imutabilidade', () => {
            const dataSource = new DataSource(
                makeDataSourceInput({
                    files: [
                        makeFile({
                            fileName: 'foto1.png',
                            storageFileUrl: 'https://storage/foto1.png',
                        }),
                        makeFile({
                            fileName: 'foto2.png',
                            storageFileUrl: 'https://storage/foto2.png',
                        }),
                    ],
                    fileMimeType: DATA_SOURCE_MIME_TYPE.PNG,
                    columns: [makeColumn('Foto')],
                }),
            )

            const updated = dataSource.setStorageFileUrls([
                'https://nova/foto1.png',
                'https://nova/foto2.png',
            ])

            expect(updated.getStorageFileUrl(0)).toBe('https://nova/foto1.png')
            expect(updated.getStorageFileUrl(1)).toBe('https://nova/foto2.png')
            expect(dataSource.getStorageFileUrl(0)).toBe(
                'https://storage/foto1.png',
            )
        })

        it('deve atualizar a thumbnail preservando a imutabilidade', () => {
            const dataSource = new DataSource(makeDataSourceInput())
            const updated = dataSource.setThumbnailUrl(
                'https://thumbnail.com/img.png',
            )

            expect(updated.serialize().thumbnailUrl).toBe(
                'https://thumbnail.com/img.png',
            )
            expect(dataSource.serialize().thumbnailUrl).toBeNull()
        })
    })

    describe('Identificação de arquivo no Drive', () => {
        it('deve identificar o ID a partir de um link do Google Drive', () => {
            const url = 'https://drive.google.com/file/d/xYz1-_2/view'

            expect(DataSource.getFileIdFromUrl(url)).toBe('xYz1-_2')
        })

        it('deve retornar null para um link não reconhecido', () => {
            expect(
                DataSource.getFileIdFromUrl('https://example.com/file'),
            ).toBeNull()
        })
    })

    describe('Formatos de arquivo suportados', () => {
        describe('deve aceitar os seguintes mime types (formatos) como válidos', () => {
            it.each([
                { label: 'CSV', mimeType: DATA_SOURCE_MIME_TYPE.CSV },
                { label: 'XLSX', mimeType: DATA_SOURCE_MIME_TYPE.XLSX },
                { label: 'ODS', mimeType: DATA_SOURCE_MIME_TYPE.ODS },
                {
                    label: 'Google Sheets',
                    mimeType: DATA_SOURCE_MIME_TYPE.GOOGLE_SHEETS,
                },
                { label: 'PNG', mimeType: DATA_SOURCE_MIME_TYPE.PNG },
                { label: 'JPEG', mimeType: DATA_SOURCE_MIME_TYPE.JPEG },
            ])('$mimeType', ({ mimeType }) => {
                expect(DataSource.isValidFileMimeType(mimeType)).toBe(true)
            })
        })

        describe('deve rejeitar os seguintes mime types (formatos) como inválidos', () => {
            it.each([
                { label: 'PDF', mimeType: 'application/pdf' },
                { label: 'nome vazio', mimeType: '' },
            ])('$mimeType', ({ mimeType }) => {
                expect(DataSource.isValidFileMimeType(mimeType)).toBe(false)
            })
        })

        describe('deve reconhecer os seguintes mime types (formatos) como imagem', () => {
            it.each([
                { label: 'PNG', mimeType: DATA_SOURCE_MIME_TYPE.PNG },
                { label: 'JPEG', mimeType: DATA_SOURCE_MIME_TYPE.JPEG },
            ])('$mimeType', ({ mimeType }) => {
                expect(DataSource.isImageMimeType(mimeType)).toBe(true)
            })
        })

        describe('deve reconhecer os seguintes mime types (formatos) como planilha', () => {
            it.each([
                { label: 'CSV', mimeType: DATA_SOURCE_MIME_TYPE.CSV },
                { label: 'XLSX', mimeType: DATA_SOURCE_MIME_TYPE.XLSX },
            ])('$mimeType', ({ mimeType }) => {
                expect(DataSource.isImageMimeType(mimeType)).toBe(false)
            })
        })
    })

    describe('Consulta de colunas', () => {
        it('deve indicar corretamente quando uma coluna existe na fonte de dados', () => {
            const dataSource = new DataSource(makeDataSourceInput())

            expect(dataSource.hasColumn('Nome')).toBe(true)
            expect(dataSource.hasColumn('Email')).toBe(true)
        })

        it('deve indicar corretamente quando uma coluna não existe na fonte de dados', () => {
            const dataSource = new DataSource(makeDataSourceInput())

            expect(dataSource.hasColumn('Telefone')).toBe(false)
        })
    })

    describe('Substituição de imagens por planilha', () => {
        it('deve substituir os arquivos de imagem por uma planilha quando a fonte for de imagens', () => {
            const dataSource = new DataSource(
                makeDataSourceInput({
                    files: [
                        makeFile({
                            fileName: 'foto.png',
                            storageFileUrl:
                                'https://storage.example.com/foto.png',
                        }),
                    ],
                    fileMimeType: DATA_SOURCE_MIME_TYPE.PNG,
                    columns: [makeColumn('Foto')],
                }),
            )

            const updated = dataSource.replaceWithSpreadsheet(
                makeFile({ fileName: 'dados.csv' }),
                DATA_SOURCE_MIME_TYPE.CSV,
                INPUT_METHOD.UPLOAD,
            )

            expect(updated.getFileMimeType()).toBe(DATA_SOURCE_MIME_TYPE.CSV)
            expect(updated.hasImageMimeType()).toBe(false)
        })

        it('deve impedir a substituição quando a fonte de dados já é uma planilha', () => {
            const dataSource = new DataSource(makeDataSourceInput())

            expect(() =>
                dataSource.replaceWithSpreadsheet(
                    makeFile({ fileName: 'novo.csv' }),
                    DATA_SOURCE_MIME_TYPE.CSV,
                    INPUT_METHOD.UPLOAD,
                ),
            ).toThrow(DataSourceNotImageError)
        })
    })
})
