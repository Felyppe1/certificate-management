import { describe, expect, it } from 'vitest'
import {
    DataSourceRow,
    PROCESSING_STATUS_ENUM,
} from './data-source-row'
import { DataSourceColumnInput } from './data-source-column'

const CERTIFICATE_ID = 'cert-1'

const defaultColumns: DataSourceColumnInput[] = [
    { name: 'Nome', type: 'string', arrayMetadata: null },
    { name: 'Pontos', type: 'number', arrayMetadata: null },
    { name: 'Ativo', type: 'boolean', arrayMetadata: null },
]

function createRow(
    overrides: Partial<{
        data: Record<string, string>
        columns: DataSourceColumnInput[]
    }> = {},
) {
    return DataSourceRow.create({
        certificateEmissionId: CERTIFICATE_ID,
        data: overrides.data ?? { Nome: 'João', Pontos: '100', Ativo: 'true' },
        dataSourceColumns: overrides.columns ?? defaultColumns,
        sourceRowIndex: 0,
    })
}

describe('DataSourceRow', () => {
    describe('Criação', () => {
        it('deve lançar erro quando o ID da emissão de certificado não for informado', () => {
            expect(
                () =>
                    new DataSourceRow({
                        id: 'row-1',
                        certificateEmissionId: '',
                        fileBytes: null,
                        data: { Nome: 'João' },
                        processingStatus: PROCESSING_STATUS_ENUM.PENDING,
                        sourceRowIndex: 0,
                    }),
            ).toThrow('DataSourceRow certificate emission id is required')
        })

        it('deve lançar erro quando os dados não forem informados', () => {
            expect(
                () =>
                    new DataSourceRow({
                        id: 'row-1',
                        certificateEmissionId: CERTIFICATE_ID,
                        fileBytes: null,
                        data: null as any,
                        processingStatus: PROCESSING_STATUS_ENUM.PENDING,
                        sourceRowIndex: 0,
                    }),
            ).toThrow('DataSourceRow data is required')
        })

        it('deve lançar erro quando o status de processamento não for informado', () => {
            expect(
                () =>
                    new DataSourceRow({
                        id: 'row-1',
                        certificateEmissionId: CERTIFICATE_ID,
                        fileBytes: null,
                        data: { Nome: 'João' },
                        processingStatus: '' as PROCESSING_STATUS_ENUM,
                        sourceRowIndex: 0,
                    }),
            ).toThrow('DataSourceRow processing status is required')
        })

        it('deve criar uma linha com dados e colunas válidos com sucesso', () => {
            const row = createRow()

            expect(row.getProcessingStatus()).toBe(PROCESSING_STATUS_ENUM.PENDING)
            expect(row.getCertificateEmissionId()).toBe(CERTIFICATE_ID)
        })

        it('deve lançar erro quando a coluna dos dados não existir no schema da fonte', () => {
            expect(() =>
                createRow({ data: { ColunaInexistente: 'valor' } }),
            ).toThrow('Column "ColunaInexistente" does not exist in the data source')
        })

        it('deve lançar erro quando o valor não for compatível com o tipo da coluna', () => {
            expect(() =>
                createRow({ data: { Nome: 'João', Pontos: 'nao-e-numero', Ativo: 'true' } }),
            ).toThrow('invalid value')
        })
    })

    describe('Ciclo de vida de processamento', () => {
        it('deve iniciar a geração alterando o status para RUNNING com sucesso', () => {
            const row = createRow()

            row.startGeneration()

            expect(row.getProcessingStatus()).toBe(PROCESSING_STATUS_ENUM.RUNNING)
        })

        it('deve permitir nova tentativa após falha alterando o status para RETRYING com sucesso', () => {
            const row = createRow()
            row.startGeneration()
            row.finishGenerationWithError()

            row.startRetry()

            expect(row.getProcessingStatus()).toBe(
                PROCESSING_STATUS_ENUM.RETRYING,
            )
        })

        it('deve lançar erro ao tentar nova tentativa quando o status não for FAILED', () => {
            const row = createRow()

            expect(() => row.startRetry()).toThrow(
                'DataSourceRow can only be retried if it is in FAILED status',
            )
        })

        it('deve finalizar a geração com sucesso, registrar os bytes e definir status COMPLETED', () => {
            const row = createRow()
            row.startGeneration()

            row.finishGenerationSuccessfully(1024)

            expect(row.getProcessingStatus()).toBe(
                PROCESSING_STATUS_ENUM.COMPLETED,
            )
            expect(row.serialize().fileBytes).toBe(1024)
        })

        it('deve lançar erro ao finalizar geração com sucesso sem informar tamanho do arquivo', () => {
            const row = createRow()
            row.startGeneration()

            expect(() => row.finishGenerationSuccessfully(0)).toThrow(
                'DataSourceRow file bytes is required for successful generation',
            )
        })

        it('deve finalizar a geração com sucesso com o valor mínimo de bytes possível', () => {
            const row = createRow()
            row.startGeneration()

            row.finishGenerationSuccessfully(1)

            expect(row.getProcessingStatus()).toBe(PROCESSING_STATUS_ENUM.COMPLETED)
            expect(row.serialize().fileBytes).toBe(1)
        })

        it('deve finalizar a geração com erro alterando o status para FAILED com sucesso', () => {
            const row = createRow()
            row.startGeneration()

            row.finishGenerationWithError()

            expect(row.getProcessingStatus()).toBe(PROCESSING_STATUS_ENUM.FAILED)
        })

        it('deve reiniciar o status de processamento para PENDING e zerar os bytes com sucesso', () => {
            const row = createRow()
            row.startGeneration()
            row.finishGenerationSuccessfully(512)

            row.resetProcessingStatus()

            expect(row.getProcessingStatus()).toBe(PROCESSING_STATUS_ENUM.PENDING)
            expect(row.serialize().fileBytes).toBeNull()
        })
    })

    describe('Atualização de dados', () => {
        it('deve atualizar os dados de uma linha com sucesso', () => {
            const row = createRow()

            row.updateData({ Nome: 'Maria' }, defaultColumns)

            expect(row.serialize().data.Nome).toBe('Maria')
        })

        it('deve lançar erro ao atualizar com coluna inexistente no schema', () => {
            const row = createRow()

            expect(() =>
                row.updateData({ ColunaInexistente: 'valor' }, defaultColumns),
            ).toThrow('Column "ColunaInexistente" does not exist in the data source')
        })

        it('deve lançar erro ao atualizar com valor incompatível com o tipo da coluna', () => {
            const row = createRow()

            expect(() =>
                row.updateData({ Pontos: 'nao-e-numero' }, defaultColumns),
            ).toThrow('has invalid value')
        })
    })

    describe('Validação de valores', () => {
        it('deve aceitar string vazia para qualquer tipo de coluna', () => {
            expect(DataSourceRow.validateValue('', 'number', null)).toBe(true)
            expect(DataSourceRow.validateValue('   ', 'boolean', null)).toBe(true)
            expect(DataSourceRow.validateValue('', 'date', null)).toBe(true)
        })

        it('deve aceitar qualquer valor para o tipo string', () => {
            expect(DataSourceRow.validateValue('qualquer texto', 'string', null)).toBe(true)
            expect(DataSourceRow.validateValue('123', 'string', null)).toBe(true)
        })

        it('deve aceitar número válido e rejeitar texto para o tipo number', () => {
            expect(DataSourceRow.validateValue('42', 'number', null)).toBe(true)
            expect(DataSourceRow.validateValue('nao-e-numero', 'number', null)).toBe(false)
        })

        it('deve aceitar itens booleanos válidos para o tipo array com metadados booleano', () => {
            const metadata = { separator: ',', itemType: 'boolean' as const }

            expect(DataSourceRow.validateValue('true,false,true', 'array', metadata)).toBe(true)
            expect(DataSourceRow.validateValue('true,texto', 'array', metadata)).toBe(false)
        })

        it('deve aceitar itens numéricos válidos para o tipo array com metadados number', () => {
            const metadata = { separator: ',', itemType: 'number' as const }

            expect(DataSourceRow.validateValue('10,20,30', 'array', metadata)).toBe(true)
            expect(DataSourceRow.validateValue('10,abc', 'array', metadata)).toBe(false)
        })

        it('deve lançar erro quando o tipo da coluna for desconhecido', () => {
            expect(() =>
                DataSourceRow.validateValue('valor', 'unknown' as any, null),
            ).toThrow('Invalid column type')
        })

        it('deve aceitar itens de data válidos para o tipo array com metadados date', () => {
            const metadata = { separator: ',', itemType: 'date' as const }

            expect(DataSourceRow.validateValue('25/12/2024,01/01/2000', 'array', metadata)).toBe(true)
            expect(DataSourceRow.validateValue('25/12/2024,nao-e-data', 'array', metadata)).toBe(false)
        })
    })
})