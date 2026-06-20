import { describe, expect, it, vi, beforeEach, Mock } from 'vitest'
import { FinishCertificatesGenerationUseCase } from './finish-certificates-generation-use-case'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IUsersRepository } from './interfaces/repository/iusers-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import { DataSourceRowNotFoundError } from '../domain/error/not-found-error/data-source-row-not-found-error'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { FileBytesMissingError } from '../domain/error/validation-error/file-bytes-missing-error'

describe('FinishCertificatesGenerationUseCase', () => {
    const CERTIFICATE_ID = 'cert-1'
    const ROW_ID = 'row-1'

    function createDataSourceRowMock() {
        return {
            finishGenerationSuccessfully: vi.fn(),
            finishGenerationWithError: vi.fn(),
            serialize: vi
                .fn()
                .mockReturnValue({ certificateEmissionId: CERTIFICATE_ID }),
        }
    }

    let dataSourceRowsRepository: {
        getById: Mock<IDataSourceRowsRepository['getById']>
        update: Mock<IDataSourceRowsRepository['update']>
        allRowsFinishedProcessing: Mock<
            IDataSourceRowsRepository['allRowsFinishedProcessing']
        >
    }
    let certificatesRepository: {
        checkIfExistsById: Mock<ICertificatesRepository['checkIfExistsById']>
        markAsGeneratedIfNotAlready: Mock<
            ICertificatesRepository['markAsGeneratedIfNotAlready']
        >
    }
    let usersRepository: {
        upsertDailyUsage: Mock<IUsersRepository['upsertDailyUsage']>
    }

    beforeEach(() => {
        dataSourceRowsRepository = {
            getById: vi.fn(),
            update: vi.fn(),
            allRowsFinishedProcessing: vi.fn(),
        }
        certificatesRepository = {
            checkIfExistsById: vi.fn(),
            markAsGeneratedIfNotAlready: vi.fn(),
        }
        usersRepository = { upsertDailyUsage: vi.fn() }
    })

    function makeUseCase() {
        return new FinishCertificatesGenerationUseCase(
            dataSourceRowsRepository,
            certificatesRepository,
            usersRepository,
            {} as ITransactionManager,
        )
    }

    it('deve lançar erro quando a linha não for encontrada', async () => {
        dataSourceRowsRepository.getById.mockResolvedValue(null)

        await expect(
            makeUseCase().execute({
                dataSourceRowId: ROW_ID,
                success: true,
                totalBytes: 1024,
            }),
        ).rejects.toThrow(DataSourceRowNotFoundError)
    })

    it('deve lançar erro quando bytes não forem informados em caso de sucesso', async () => {
        dataSourceRowsRepository.getById.mockResolvedValue(
            createDataSourceRowMock() as any,
        )

        await expect(
            makeUseCase().execute({ dataSourceRowId: ROW_ID, success: true }),
        ).rejects.toThrow(FileBytesMissingError)
    })

    it('deve lançar erro quando a emissão de certificado não existir', async () => {
        const rowMock = createDataSourceRowMock()
        dataSourceRowsRepository.getById.mockResolvedValue(rowMock as any)
        certificatesRepository.checkIfExistsById.mockResolvedValue(false)

        await expect(
            makeUseCase().execute({
                dataSourceRowId: ROW_ID,
                success: true,
                totalBytes: 1024,
            }),
        ).rejects.toThrow(CertificateNotFoundError)
    })

    it('deve marcar a linha como concluída com sucesso', async () => {
        const rowMock = createDataSourceRowMock()
        dataSourceRowsRepository.getById.mockResolvedValue(rowMock as any)
        certificatesRepository.checkIfExistsById.mockResolvedValue(true)
        dataSourceRowsRepository.allRowsFinishedProcessing.mockResolvedValue(
            false,
        )

        await makeUseCase().execute({
            dataSourceRowId: ROW_ID,
            success: true,
            totalBytes: 2048,
        })

        expect(rowMock.finishGenerationSuccessfully).toHaveBeenCalledWith(2048)
    })

    it('deve marcar a linha como falha', async () => {
        const rowMock = createDataSourceRowMock()
        dataSourceRowsRepository.getById.mockResolvedValue(rowMock as any)
        certificatesRepository.checkIfExistsById.mockResolvedValue(true)
        dataSourceRowsRepository.allRowsFinishedProcessing.mockResolvedValue(
            false,
        )

        await makeUseCase().execute({ dataSourceRowId: ROW_ID, success: false })

        expect(rowMock.finishGenerationWithError).toHaveBeenCalled()
    })

    it('deve registrar uso diário quando sucesso com userId', async () => {
        const rowMock = createDataSourceRowMock()
        dataSourceRowsRepository.getById.mockResolvedValue(rowMock as any)
        certificatesRepository.checkIfExistsById.mockResolvedValue(true)
        dataSourceRowsRepository.allRowsFinishedProcessing.mockResolvedValue(
            false,
        )

        await makeUseCase().execute({
            dataSourceRowId: ROW_ID,
            success: true,
            totalBytes: 512,
            userId: 'user-1',
        })

        expect(usersRepository.upsertDailyUsage).toHaveBeenCalledWith(
            'user-1',
            {
                certificatesGeneratedCount: 1,
            },
        )
    })

    it('deve não registrar uso quando userId não for informado', async () => {
        const rowMock = createDataSourceRowMock()
        dataSourceRowsRepository.getById.mockResolvedValue(rowMock as any)
        certificatesRepository.checkIfExistsById.mockResolvedValue(true)
        dataSourceRowsRepository.allRowsFinishedProcessing.mockResolvedValue(
            false,
        )

        await makeUseCase().execute({
            dataSourceRowId: ROW_ID,
            success: true,
            totalBytes: 512,
        })

        expect(usersRepository.upsertDailyUsage).not.toHaveBeenCalled()
    })

    it('deve marcar o certificado como gerado quando todas as linhas terminarem', async () => {
        const rowMock = createDataSourceRowMock()
        dataSourceRowsRepository.getById.mockResolvedValue(rowMock as any)
        certificatesRepository.checkIfExistsById.mockResolvedValue(true)
        dataSourceRowsRepository.allRowsFinishedProcessing.mockResolvedValue(
            true,
        )

        await makeUseCase().execute({ dataSourceRowId: ROW_ID, success: false })

        expect(
            certificatesRepository.markAsGeneratedIfNotAlready,
        ).toHaveBeenCalledWith(CERTIFICATE_ID)
    })

    it('deve não marcar o certificado quando ainda há linhas em processamento', async () => {
        const rowMock = createDataSourceRowMock()
        dataSourceRowsRepository.getById.mockResolvedValue(rowMock as any)
        certificatesRepository.checkIfExistsById.mockResolvedValue(true)
        dataSourceRowsRepository.allRowsFinishedProcessing.mockResolvedValue(
            false,
        )

        await makeUseCase().execute({ dataSourceRowId: ROW_ID, success: false })

        expect(
            certificatesRepository.markAsGeneratedIfNotAlready,
        ).not.toHaveBeenCalled()
    })
})
