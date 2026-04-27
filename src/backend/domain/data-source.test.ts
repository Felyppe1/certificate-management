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
import { VALIDATION_ERROR_TYPE, ValidationError } from './error/validation-error'
import { INPUT_METHOD } from './certificate'

const makeFile = (overrides = {}) => ({
    fileName: 'dados.csv',
    driveFileId: null,
    storageFileUrl: 'https://storage.example.com/dados.csv',
    ...overrides,
})

const makeColumn = (name: string, type: 'string' | 'number' | 'boolean' | 'date' | 'array' = 'string') => ({
    name,
    type,
    arrayMetadata: null,
})

const makeDataSourceInput = (overrides: Partial<DataSourceInput> = {}): DataSourceInput => ({
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

const makeCreateInput = (overrides: Partial<CreateDataSourceInput> = {}): CreateDataSourceInput => ({
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
            expect(() =>
                new DataSource(makeDataSourceInput({ inputMethod: '' as INPUT_METHOD })),
            ).toThrow('DataSource input method is required')
        })

        it('deve exigir pelo menos um arquivo vinculado', () => {
            expect(() =>
                new DataSource(makeDataSourceInput({ files: [] })),
            ).toThrow('DataSource files are required')
        })

        it('deve exigir o formato do arquivo', () => {
            expect(() =>
                new DataSource(makeDataSourceInput({ fileMimeType: '' as DATA_SOURCE_MIME_TYPE })),
            ).toThrow('DataSource mimetype is required')
        })

        it('deve exigir a linha onde estão os cabeçalhos da planilha', () => {
            expect(() =>
                new DataSource(makeDataSourceInput({ columnsRow: 0 })),
            ).toThrow('DataSource columns row is required')
        })

        it('deve exigir que os cabeçalhos estejam na linha 1 ou superior', () => {
            expect(() =>
                new DataSource(makeDataSourceInput({ columnsRow: -1, dataRowStart: 0 })),
            ).toThrow('DataSource columns row must be greater than 0')
        })

        it('deve exigir a linha inicial dos dados', () => {
            expect(() =>
                new DataSource(makeDataSourceInput({ dataRowStart: 0 })),
            ).toThrow('DataSource data row start is required')
        })

        it('deve exigir que os dados comecem após a linha de cabeçalhos', () => {
            expect(() =>
                new DataSource(makeDataSourceInput({ columnsRow: 2, dataRowStart: 2 })),
            ).toThrow('DataSource data row start must be greater than columns row')
        })

        it('deve exigir ao menos uma coluna cadastrada', () => {
            expect(() =>
                new DataSource(makeDataSourceInput({ columns: [] })),
            ).toThrow('DataSource columns is required')
        })

        it('deve impedir o cadastro de mais imagens do que o limite permitido', () => {
            const imageFiles = Array.from({ length: MAX_IMAGE_FILES + 1 }, (_, i) =>
                makeFile({ fileName: `foto${i}.png`, storageFileUrl: `https://storage.example.com/foto${i}.png` }),
            )

            expect(() =>
                new DataSource(
                    makeDataSourceInput({
                        files: imageFiles,
                        fileMimeType: DATA_SOURCE_MIME_TYPE.PNG,
                        columns: [makeColumn('Foto')],
                    }),
                ),
            ).toThrow(ValidationError)
        })

        it('deve impedir o cadastro de mais de um arquivo para planilhas', () => {
            expect(() =>
                new DataSource(
                    makeDataSourceInput({
                        files: [
                            makeFile(),
                            makeFile({ fileName: 'dados2.csv', storageFileUrl: 'https://storage.example.com/dados2.csv' }),
                        ],
                    }),
                ),
            ).toThrow(ValidationError)
        })
    })

    describe('Criação com inferência de tipos das colunas', () => {
        it('deve identificar automaticamente os tipos das colunas com base nos dados informados', () => {
            const dataSource = DataSource.create(makeCreateInput())

            expect(dataSource.getColumns()).toHaveLength(2)
        })

        it('deve impedir a criação quando o número de colunas ultrapassar o limite permitido', () => {
            const columns = Array.from({ length: MAX_DATA_SOURCE_COLUMNS + 1 }, (_, i) => `Coluna${i}`)
            const rows = [Object.fromEntries(columns.map(c => [c, 'valor']))]

            expect(() =>
                DataSource.create(makeCreateInput({ columns, rows })),
            ).toThrow(ValidationError)
        })

        it('deve impedir a criação quando o número de linhas ultrapassar o limite permitido', () => {
            const rows = Array.from({ length: MAX_DATA_SOURCE_ROWS + 1 }, () => ({
                Nome: 'João',
                Email: 'joao@email.com',
            }))

            expect(() =>
                DataSource.create(makeCreateInput({ rows })),
            ).toThrow(ValidationError)
        })

        it('deve impedir a criação quando os dados contiverem colunas não declaradas no cabeçalho', () => {
            const rows = [{ Nome: 'João', Email: 'joao@email.com', ColunaExtra: 'valor' }]

            expect(() =>
                DataSource.create(makeCreateInput({ rows })),
            ).toThrow(ValidationError)
        })

        it('deve definir todas as colunas como texto quando não há dados para inferência', () => {
            const dataSource = DataSource.create(makeCreateInput({ rows: [] }))

            dataSource.getColumns().forEach(col => {
                expect(col.type).toBe('string')
            })
        })
    })

    describe('Alteração dos tipos de colunas', () => {
        it('deve impedir a alteração para uma coluna que não existe na fonte de dados', () => {
            const dataSource = new DataSource(makeDataSourceInput())

            expect(() =>
                dataSource.setColumns([{ name: 'ColunaInexistente', type: 'string', arrayMetadata: null }]),
            ).toThrow(ValidationError)
        })

        it('deve impedir a conversão de número para booleano por ser incompatível', () => {
            const dataSource = new DataSource(
                makeDataSourceInput({ columns: [makeColumn('Quantidade', 'number')] }),
            )

            expect(() =>
                dataSource.setColumns([{ name: 'Quantidade', type: 'boolean', arrayMetadata: null }]),
            ).toThrow(ValidationError)
        })

        it('deve impedir a conversão de booleano para data por ser incompatível', () => {
            const dataSource = new DataSource(
                makeDataSourceInput({ columns: [makeColumn('Ativo', 'boolean')] }),
            )

            expect(() =>
                dataSource.setColumns([{ name: 'Ativo', type: 'date', arrayMetadata: null }]),
            ).toThrow(ValidationError)
        })

        it('deve avisar quando a conversão de texto para número pode causar perda de dados', () => {
            const dataSource = new DataSource(
                makeDataSourceInput({ columns: [makeColumn('Valor', 'string')] }),
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

    describe('Substituição de imagens por planilha', () => {
        it('deve substituir os arquivos de imagem por uma planilha quando a fonte for de imagens', () => {
            const dataSource = new DataSource(
                makeDataSourceInput({
                    files: [makeFile({ fileName: 'foto.png', storageFileUrl: 'https://storage.example.com/foto.png' })],
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
            ).toThrow(ValidationError)
        })
    })
})
