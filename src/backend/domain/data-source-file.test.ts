import { describe, expect, it } from 'vitest'
import { DataSourceFile } from './data-source-file'

describe('DataSourceFile', () => {
    describe('Regras obrigatórias para cadastro', () => {
        it('deve criar um arquivo de fonte de dados com driveFileId com sucesso', () => {
            const file = new DataSourceFile({
                fileName: 'dados.csv',
                driveFileId: 'abc123',
                storageFileUrl: null,
            })

            expect(file.getName()).toBe('dados.csv')
            expect(file.getDriveFileId()).toBe('abc123')
            expect(file.getStorageFileUrl()).toBeNull()
        })

        it('deve criar um arquivo de fonte de dados com storageFileUrl com sucesso', () => {
            const file = new DataSourceFile({
                fileName: 'dados.csv',
                driveFileId: null,
                storageFileUrl: 'https://storage.example.com/dados.csv',
            })

            expect(file.getName()).toBe('dados.csv')
            expect(file.getDriveFileId()).toBeNull()
            expect(file.getStorageFileUrl()).toBe(
                'https://storage.example.com/dados.csv',
            )
        })

        it('deve exigir o nome do arquivo', () => {
            expect(
                () =>
                    new DataSourceFile({
                        fileName: '',
                        driveFileId: 'abc123',
                        storageFileUrl: null,
                    }),
            ).toThrow('DataSource file name is required')
        })

        it('deve lançar erro quando nenhum identificador for fornecido', () => {
            expect(
                () =>
                    new DataSourceFile({
                        fileName: 'dados.csv',
                        driveFileId: null,
                        storageFileUrl: null,
                    }),
            ).toThrow(
                'Either driveFileId or storageFileUrl must be provided for DataSource file',
            )
        })

        it('deve lançar erro quando driveFileId e storageFileUrl forem fornecidos ao mesmo tempo', () => {
            expect(
                () =>
                    new DataSourceFile({
                        fileName: 'dados.csv',
                        driveFileId: 'abc123',
                        storageFileUrl: 'https://storage.example.com/dados.csv',
                    }),
            ).toThrow(
                'driveFileId and storageFileUrl cannot both be provided for DataSource file',
            )
        })
    })
})