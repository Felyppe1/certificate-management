import { describe, expect, it, vi } from 'vitest'
import { UpdateCertificateEmissionUseCase } from './update-certificate-emission-use-case'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { DataSource, DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'

describe('UpdateCertificateEmissionUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'

    class TransactionManagerStub implements Pick<ITransactionManager, 'run'> {
        async run<T>(work: () => Promise<T>): Promise<T> {
            return work()
        }
    }

    function createDataSource() {
        return new DataSource({
            files: [
                {
                    fileName: 'dados.csv',
                    storageFileUrl: 'https://storage/dados.csv',
                    driveFileId: null,
                },
            ],
            inputMethod: INPUT_METHOD.UPLOAD,
            fileMimeType: DATA_SOURCE_MIME_TYPE.CSV,
            thumbnailUrl: null,
            columnsRow: 1,
            dataRowStart: 2,
            columns: [{ name: 'Nome', type: 'string' as const, arrayMetadata: null }],
            googleAccountEmail: null,
        })
    }

    function createCertificateEmission(overrides?: {
        userId?: string
        status?: CERTIFICATE_STATUS
        dataSource?: DataSource | null
        variableColumnMapping?: Record<string, string | null> | null
    }) {
        return new CertificateEmission({
            id: CERTIFICATE_ID,
            name: 'Meu Certificado',
            userId: overrides?.userId ?? USER_ID,
            template: null,
            createdAt: new Date(),
            status: overrides?.status ?? CERTIFICATE_STATUS.DRAFT,
            dataSource: overrides?.dataSource !== undefined ? overrides.dataSource : null,
            variableColumnMapping: overrides?.variableColumnMapping !== undefined
                ? overrides.variableColumnMapping
                : null,
        })
    }

    it('deve atualizar o nome da emissão de certificado com sucesso', async () => {
        const certificateEmission = createCertificateEmission()

        const certificatesRepositoryMock: Pick<ICertificatesRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(certificateEmission),
            update: vi.fn(),
        }

        const dataSourceRowsRepositoryMock: Pick<
            IDataSourceRowsRepository,
            'resetProcessingStatusByCertificateEmissionId'
        > = {
            resetProcessingStatusByCertificateEmissionId: vi.fn(),
        }

        const useCase = new UpdateCertificateEmissionUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryMock,
            new TransactionManagerStub(),
        )

        await useCase.execute({ userId: USER_ID, id: CERTIFICATE_ID, name: 'Novo Nome' })

        expect(certificatesRepositoryMock.update).toHaveBeenCalledWith(certificateEmission)
        expect(certificateEmission.getName()).toBe('Novo Nome')
        expect(dataSourceRowsRepositoryMock.resetProcessingStatusByCertificateEmissionId).not.toHaveBeenCalled()
    })

    it('deve atualizar o mapeamento de variáveis com sucesso', async () => {
        // Sem template (sem variáveis) + datasource: null → {} é uma mudança válida
        const certificateEmission = createCertificateEmission({
            dataSource: createDataSource(),
            variableColumnMapping: null,
        })

        const certificatesRepositoryMock: Pick<ICertificatesRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(certificateEmission),
            update: vi.fn(),
        }

        const dataSourceRowsRepositoryMock: Pick<
            IDataSourceRowsRepository,
            'resetProcessingStatusByCertificateEmissionId'
        > = {
            resetProcessingStatusByCertificateEmissionId: vi.fn(),
        }

        const useCase = new UpdateCertificateEmissionUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryMock,
            new TransactionManagerStub(),
        )

        // null → {} muda o JSON, dispara transação; datasource existe → reset é chamado
        await useCase.execute({
            userId: USER_ID,
            id: CERTIFICATE_ID,
            variableColumnMapping: {},
        })

        expect(dataSourceRowsRepositoryMock.resetProcessingStatusByCertificateEmissionId)
            .toHaveBeenCalledWith(CERTIFICATE_ID)
        expect(certificatesRepositoryMock.update).toHaveBeenCalledWith(certificateEmission)
    })

    it('deve atualizar o mapeamento de variáveis com sucesso quando não há fonte de dados vinculada', async () => {
        // Sem template + sem datasource: null → {} é uma mudança válida
        const certificateEmission = createCertificateEmission({
            dataSource: null,
            variableColumnMapping: null,
        })

        const certificatesRepositoryMock: Pick<ICertificatesRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(certificateEmission),
            update: vi.fn(),
        }

        const dataSourceRowsRepositoryMock: Pick<
            IDataSourceRowsRepository,
            'resetProcessingStatusByCertificateEmissionId'
        > = {
            resetProcessingStatusByCertificateEmissionId: vi.fn(),
        }

        const useCase = new UpdateCertificateEmissionUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryMock,
            new TransactionManagerStub(),
        )

        // null → {} muda o JSON, dispara transação; sem datasource → reset NÃO é chamado
        await useCase.execute({
            userId: USER_ID,
            id: CERTIFICATE_ID,
            variableColumnMapping: {},
        })

        expect(dataSourceRowsRepositoryMock.resetProcessingStatusByCertificateEmissionId).not.toHaveBeenCalled()
        expect(certificatesRepositoryMock.update).toHaveBeenCalledWith(certificateEmission)
    })

    it('deve não resetar o processamento quando o mapeamento de variáveis não muda', async () => {
        // variableColumnMapping: null → passa null → JSON.stringify iguais → sem transação
        const certificateEmission = createCertificateEmission({ variableColumnMapping: null })

        const certificatesRepositoryMock: Pick<ICertificatesRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(certificateEmission),
            update: vi.fn(),
        }

        const dataSourceRowsRepositoryMock: Pick<
            IDataSourceRowsRepository,
            'resetProcessingStatusByCertificateEmissionId'
        > = {
            resetProcessingStatusByCertificateEmissionId: vi.fn(),
        }

        const useCase = new UpdateCertificateEmissionUseCase(
            certificatesRepositoryMock,
            dataSourceRowsRepositoryMock,
            new TransactionManagerStub(),
        )

        await useCase.execute({
            userId: USER_ID,
            id: CERTIFICATE_ID,
            variableColumnMapping: null,
        })

        expect(dataSourceRowsRepositoryMock.resetProcessingStatusByCertificateEmissionId).not.toHaveBeenCalled()
        expect(certificatesRepositoryMock.update).toHaveBeenCalledWith(certificateEmission)
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        const certificatesRepositoryMock: Pick<ICertificatesRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }

        const useCase = new UpdateCertificateEmissionUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({ userId: USER_ID, id: 'nao-existe', name: 'Novo Nome' }),
        ).rejects.toThrow(CertificateNotFoundError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        const certificatesRepositoryMock: Pick<ICertificatesRepository, 'getById' | 'update'> = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission({ userId: 'outro-usuario' })),
            update: vi.fn(),
        }

        const useCase = new UpdateCertificateEmissionUseCase(
            certificatesRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as ITransactionManager,
        )

        await expect(
            useCase.execute({ userId: USER_ID, id: CERTIFICATE_ID, name: 'Novo Nome' }),
        ).rejects.toThrow(NotCertificateOwnerError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })
})