import { describe, expect, it, vi } from 'vitest'
import { DeleteDataSourceUseCase } from './delete-data-source-use-case'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IBucket } from './interfaces/cloud/ibucket'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { DataSource, DATA_SOURCE_MIME_TYPE } from '../domain/data-source'
import { CertificateNotFoundError } from '../domain/error/not-found-error/certificate-not-found-error'
import { NotCertificateOwnerError } from '../domain/error/forbidden-error/not-certificate-owner-error'
import { CertificateEmittedError } from '../domain/error/validation-error/certificate-emitted-error'

describe('DeleteDataSourceUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'

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
    }) {
        return new CertificateEmission({
            id: CERTIFICATE_ID,
            name: 'Name',
            userId: overrides?.userId ?? USER_ID,
            template: null,
            createdAt: new Date(),
            status: overrides?.status ?? CERTIFICATE_STATUS.DRAFT,
            dataSource: overrides?.dataSource ?? createDataSource(),
            variableColumnMapping: null,
        })
    }

    it('deve remover a fonte de dados da emissão de certificado com sucesso', async () => {
        const certificateEmission = createCertificateEmission()

        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(certificateEmission),
            update: vi.fn(),
        }

        class BucketStub implements Pick<IBucket, 'deleteObject'> {
            async deleteObject() {}
        }

        const useCase = new DeleteDataSourceUseCase(
            certificatesRepositoryMock,
            new BucketStub(),
        )

        await useCase.execute({ certificateId: CERTIFICATE_ID, userId: USER_ID })

        expect(certificatesRepositoryMock.update).toHaveBeenCalledWith(
            certificateEmission,
        )
        expect(certificateEmission.hasDataSource()).toBe(false)
    })

    it('deve lançar erro quando a emissão de certificado não for encontrada', async () => {
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }

        const useCase = new DeleteDataSourceUseCase(
            certificatesRepositoryMock,
            {} as IBucket,
        )

        await expect(
            useCase.execute({ certificateId: 'nao-existe', userId: USER_ID }),
        ).rejects.toThrow(CertificateNotFoundError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando o usuário não for o dono do certificado', async () => {
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi
                .fn()
                .mockResolvedValue(
                    createCertificateEmission({ userId: 'outro-usuario' }),
                ),
            update: vi.fn(),
        }

        const useCase = new DeleteDataSourceUseCase(
            certificatesRepositoryMock,
            {} as IBucket,
        )

        await expect(
            useCase.execute({ certificateId: CERTIFICATE_ID, userId: USER_ID }),
        ).rejects.toThrow(NotCertificateOwnerError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('deve lançar erro quando a emissão de certificado já tiver sido emitida', async () => {
        const certificatesRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(
                createCertificateEmission({ status: CERTIFICATE_STATUS.EMITTED }),
            ),
            update: vi.fn(),
        }

        const useCase = new DeleteDataSourceUseCase(
            certificatesRepositoryMock,
            {} as IBucket,
        )

        await expect(
            useCase.execute({ certificateId: CERTIFICATE_ID, userId: USER_ID }),
        ).rejects.toThrow(CertificateEmittedError)

        expect(certificatesRepositoryMock.update).not.toHaveBeenCalled()
    })
})