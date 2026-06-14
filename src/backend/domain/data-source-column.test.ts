import { describe, expect, it } from 'vitest'
import { DataSourceColumn } from './data-source-column'
import { DataSourceInvalidColumnTypesError } from './error/validation-error/data-source-invalid-column-types-error'
import { DataSourceInvalidColumnMetadataError } from './error/validation-error/data-source-invalid-column-metadata-error'

describe('DataSourceColumn', () => {
    describe('Regras obrigatórias para cadastro', () => {
        it('deve criar uma coluna com tipo e nome válidos com sucesso', () => {
            const column = new DataSourceColumn({
                name: 'Nome',
                type: 'string',
                arrayMetadata: null,
            })

            expect(column.getName()).toBe('Nome')
            expect(column.getType()).toBe('string')
            expect(column.getArrayMetadata()).toBeNull()
        })

        it('deve exigir o nome da coluna', () => {
            expect(
                () =>
                    new DataSourceColumn({
                        name: '',
                        type: 'string',
                        arrayMetadata: null,
                    }),
            ).toThrow('DataSource column name is required')
        })

        it('deve lançar erro quando o tipo da coluna for inválido', () => {
            expect(
                () =>
                    new DataSourceColumn({
                        name: 'Coluna',
                        type: 'invalid' as any,
                        arrayMetadata: null,
                    }),
            ).toThrow(DataSourceInvalidColumnTypesError)
        })

        it('deve criar uma coluna do tipo array com metadados válidos com sucesso', () => {
            const column = new DataSourceColumn({
                name: 'Tags',
                type: 'array',
                arrayMetadata: { separator: ',', itemType: 'string' },
            })

            expect(column.getType()).toBe('array')
            expect(column.getArrayMetadata()).toEqual({
                separator: ',',
                itemType: 'string',
            })
        })

        it('deve lançar erro quando o tipo for array mas os metadados não forem fornecidos', () => {
            expect(
                () =>
                    new DataSourceColumn({
                        name: 'Tags',
                        type: 'array',
                        arrayMetadata: null,
                    }),
            ).toThrow(DataSourceInvalidColumnMetadataError)
        })

        describe('deve aceitar separador com comprimento válido', () => {
            it('1 caractere (limite mínimo)', () => {
                expect(
                    () =>
                        new DataSourceColumn({
                            name: 'Tags',
                            type: 'array',
                            arrayMetadata: {
                                separator: ',',
                                itemType: 'string',
                            },
                        }),
                ).not.toThrow()
            })

            it('2 caracteres (entre os limites)', () => {
                expect(
                    () =>
                        new DataSourceColumn({
                            name: 'Tags',
                            type: 'array',
                            arrayMetadata: {
                                separator: ';;',
                                itemType: 'string',
                            },
                        }),
                ).not.toThrow()
            })

            it('3 caracteres (limite máximo)', () => {
                expect(
                    () =>
                        new DataSourceColumn({
                            name: 'Tags',
                            type: 'array',
                            arrayMetadata: {
                                separator: '---',
                                itemType: 'string',
                            },
                        }),
                ).not.toThrow()
            })
        })

        describe('deve lançar erro com separador de comprimento inválido', () => {
            it('vazio — 0 caracteres (abaixo do mínimo)', () => {
                expect(
                    () =>
                        new DataSourceColumn({
                            name: 'Tags',
                            type: 'array',
                            arrayMetadata: {
                                separator: '',
                                itemType: 'string',
                            },
                        }),
                ).toThrow(DataSourceInvalidColumnMetadataError)
            })

            it('4 caracteres (acima do máximo)', () => {
                expect(
                    () =>
                        new DataSourceColumn({
                            name: 'Tags',
                            type: 'array',
                            arrayMetadata: {
                                separator: '----',
                                itemType: 'string',
                            },
                        }),
                ).toThrow(DataSourceInvalidColumnMetadataError)
            })
        })

        it('deve lançar erro quando o tipo não for array mas arrayMetadata for fornecido', () => {
            expect(
                () =>
                    new DataSourceColumn({
                        name: 'Nome',
                        type: 'string',
                        arrayMetadata: { separator: ',', itemType: 'string' },
                    }),
            ).toThrow(DataSourceInvalidColumnMetadataError)
        })
    })

    describe('Identificação de booleanos', () => {
        it('deve reconhecer os valores verdadeiro e falso em inglês e português', () => {
            expect(DataSourceColumn.isBoolean('true')).toBe(true)
            expect(DataSourceColumn.isBoolean('false')).toBe(true)
            expect(DataSourceColumn.isBoolean('True')).toBe(true)
            expect(DataSourceColumn.isBoolean('verdadeiro')).toBe(true)
            expect(DataSourceColumn.isBoolean('falso')).toBe(true)
            expect(DataSourceColumn.isBoolean('1')).toBe(true)
            expect(DataSourceColumn.isBoolean('0')).toBe(true)
        })

        it('deve rejeitar valores que não sejam booleanos', () => {
            expect(DataSourceColumn.isBoolean('sim')).toBe(false)
            expect(DataSourceColumn.isBoolean('nao')).toBe(false)
            expect(DataSourceColumn.isBoolean('texto')).toBe(false)
            expect(DataSourceColumn.isBoolean('2')).toBe(false)
        })
    })

    describe('Identificação de números', () => {
        it('deve reconhecer número no formato brasileiro', () => {
            expect(DataSourceColumn.isNumber('1.000,50')).toBe(true)
            expect(DataSourceColumn.isNumber('42')).toBe(true)
            expect(DataSourceColumn.isNumber('3,14')).toBe(true)
        })

        it('deve reconhecer número no formato americano', () => {
            expect(DataSourceColumn.isNumber('1,000.50')).toBe(true)
            expect(DataSourceColumn.isNumber('3.14')).toBe(true)
        })

        it('deve rejeitar valores que não sejam números', () => {
            expect(DataSourceColumn.isNumber('abc')).toBe(false)
            expect(DataSourceColumn.isNumber('1.2.3')).toBe(false)
            expect(DataSourceColumn.isNumber('')).toBe(false)
        })

        it('deve reconhecer número com múltiplos pontos como separador de milhar', () => {
            expect(DataSourceColumn.isNumber('1.000.000')).toBe(true)
        })
    })

    describe('Identificação de datas', () => {
        it('deve reconhecer data no formato DD/MM/AAAA', () => {
            expect(DataSourceColumn.isDate('25/12/2024')).toBe(true)
            expect(DataSourceColumn.isDate('01/01/2000')).toBe(true)
        })

        it('deve aceitar data no formato MM/DD/AAAA invertendo dia e mês', () => {
            expect(DataSourceColumn.isDate('06/25/2024')).toBe(true)
        })

        it('deve rejeitar somente o ano como data', () => {
            expect(DataSourceColumn.isDate('2024')).toBe(false)
        })

        it('deve rejeitar frações simples como data', () => {
            expect(DataSourceColumn.isDate('8/9')).toBe(false)
            expect(DataSourceColumn.isDate('8.9')).toBe(false)
        })
    })

    describe('Detecção de colunas do tipo array', () => {
        it('deve identificar vírgula como separador quando for o mais frequente', () => {
            const result = DataSourceColumn.detectArray(['a,b,c', 'x,y'])

            expect(result?.separator).toBe(',')
        })

        it('deve identificar ponto-e-vírgula como separador quando for o mais frequente', () => {
            const result = DataSourceColumn.detectArray(['a;b;c', 'x;y'])

            expect(result?.separator).toBe(';')
        })

        it('deve retornar null quando não houver separadores nos valores', () => {
            const result = DataSourceColumn.detectArray(['abc', 'def', 'ghi'])

            expect(result).toBeNull()
        })
    })

    describe('Inferência automática de tipos', () => {
        it('deve inferir os tipos corretos para um conjunto com múltiplas colunas', () => {
            const rows = [
                { Nome: 'João', Ativo: 'true', Pontos: '100' },
                { Nome: 'Maria', Ativo: 'false', Pontos: '200' },
            ]

            const columns = DataSourceColumn.inferTypes(rows)

            const nome = columns.find(c => c.name === 'Nome')
            const ativo = columns.find(c => c.name === 'Ativo')
            const pontos = columns.find(c => c.name === 'Pontos')

            expect(nome?.type).toBe('string')
            expect(ativo?.type).toBe('boolean')
            expect(pontos?.type).toBe('number')
        })

        it('deve inferir array quando os valores contiverem separadores consistentes', () => {
            const rows = [
                { Tags: 'a,b,c', Nome: 'João' },
                { Tags: 'd,e,f', Nome: 'Maria' },
            ]

            const columns = DataSourceColumn.inferTypes(rows)

            const tags = columns.find(c => c.name === 'Tags')
            expect(tags?.type).toBe('array')
            expect(tags?.arrayMetadata?.separator).toBe(',')
        })

        it('deve inferir string quando todos os valores de uma coluna estiverem vazios', () => {
            const rows = [
                { Nome: '', Observacao: '' },
                { Nome: 'João', Observacao: '' },
            ]

            const columns = DataSourceColumn.inferTypes(rows)

            const observacao = columns.find(c => c.name === 'Observacao')
            expect(observacao?.type).toBe('string')
        })
    })
})
