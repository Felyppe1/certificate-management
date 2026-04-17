import { describe, expect, it, vi } from 'vitest'
import { DeleteTemplateUseCase } from './delete-template-use-case'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { IDataSourceRowsRepository } from './interfaces/repository/idata-source-rows-repository'
import { ITransactionManager } from './interfaces/repository/itransaction-manager'
import {
    CertificateEmission,
    CERTIFICATE_STATUS,
    INPUT_METHOD,
} from '../domain/certificate'
import { Template, TEMPLATE_FILE_MIME_TYPE } from '../domain/template'
import { IBucket } from './interfaces/cloud/ibucket'
import { ForbiddenError } from '../domain/error/forbidden-error'
import { NotFoundError } from '../domain/error/not-found-error'
import { ValidationError } from '../domain/error/validation-error'

describe('DeleteTemplateUseCase', () => {
    const USER_ID = '1'
    const CERTIFICATE_ID = '1'

    function createCertificateEmission(overrides?: {
        userId?: string
        status?: CERTIFICATE_STATUS
        template?: Template | null
    }) {
        return new CertificateEmission({
            id: CERTIFICATE_ID,
            name: 'Name',
            userId: overrides?.userId ?? USER_ID,
            template:
                overrides?.template !== undefined
                    ? overrides.template
                    : new Template({
                          fileMimeType: TEMPLATE_FILE_MIME_TYPE.DOCX,
                          inputMethod: INPUT_METHOD.UPLOAD,
                          driveFileId: null,
                          storageFileUrl: 'https://storage/file.docx',
                          fileName: 'file.docx',
                          variables: [],
                          thumbnailUrl: null,
                      }),
            createdAt: new Date(),
            status: overrides?.status ?? CERTIFICATE_STATUS.DRAFT,
            dataSource: null,
            variableColumnMapping: null,
        })
    }

    it('should delete a template successfully', async () => {
        const certificateEmissionsRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(createCertificateEmission()),
            update: vi.fn(),
        }

        class BucketStub implements Pick<IBucket, 'deleteObject'> {
            async deleteObject() {}
        }

        class TransactionManagerStub
            implements Pick<ITransactionManager, 'run'>
        {
            async run<T>(work: () => Promise<T>): Promise<T> {
                return work()
            }
        }

        const dataSourceRowsRepositoryStub: Pick<
            IDataSourceRowsRepository,
            'resetProcessingStatusByCertificateEmissionId'
        > = {
            resetProcessingStatusByCertificateEmissionId: vi.fn(),
        }

        const deleteTemplateUseCase = new DeleteTemplateUseCase(
            certificateEmissionsRepositoryMock,
            dataSourceRowsRepositoryStub,
            new BucketStub(),
            new TransactionManagerStub(),
        )

        await expect(
            deleteTemplateUseCase.execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).resolves.not.toThrow()

        const updateMock =
            certificateEmissionsRepositoryMock.update as ReturnType<
                typeof vi.fn
            >
        const updatedCertificate = updateMock.mock
            .calls[0][0] as CertificateEmission
        expect(updatedCertificate.hasTemplate()).toBe(false)
    })

    it('should not delete a template when the certificate is not found', async () => {
        const certificateEmissionsRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
        }

        const deleteTemplateUseCase = new DeleteTemplateUseCase(
            certificateEmissionsRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IBucket,
            {} as ITransactionManager,
        )

        await expect(
            deleteTemplateUseCase.execute({
                certificateId: 'non-existent-id',
                userId: USER_ID,
            }),
        ).rejects.toThrow(NotFoundError)

        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('should not delete a template when the user is not the certificate owner', async () => {
        const certificateEmissionsRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi
                .fn()
                .mockResolvedValue(
                    createCertificateEmission({ userId: 'other-user-id' }),
                ),
            update: vi.fn(),
        }

        const deleteTemplateUseCase = new DeleteTemplateUseCase(
            certificateEmissionsRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IBucket,
            {} as ITransactionManager,
        )

        await expect(
            deleteTemplateUseCase.execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(ForbiddenError)

        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('should not delete a template when the certificate has already been emitted', async () => {
        const certificateEmissionsRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi.fn().mockResolvedValue(
                createCertificateEmission({
                    status: CERTIFICATE_STATUS.EMITTED,
                }),
            ),
            update: vi.fn(),
        }

        const deleteTemplateUseCase = new DeleteTemplateUseCase(
            certificateEmissionsRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IBucket,
            {} as ITransactionManager,
        )

        await expect(
            deleteTemplateUseCase.execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(ValidationError)

        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })

    it('should not delete a template when the certificate has no template', async () => {
        const certificateEmissionsRepositoryMock: Pick<
            ICertificatesRepository,
            'getById' | 'update'
        > = {
            getById: vi
                .fn()
                .mockResolvedValue(
                    createCertificateEmission({ template: null }),
                ),
            update: vi.fn(),
        }

        const deleteTemplateUseCase = new DeleteTemplateUseCase(
            certificateEmissionsRepositoryMock,
            {} as IDataSourceRowsRepository,
            {} as IBucket,
            {} as ITransactionManager,
        )

        await expect(
            deleteTemplateUseCase.execute({
                certificateId: CERTIFICATE_ID,
                userId: USER_ID,
            }),
        ).rejects.toThrow(NotFoundError)

        expect(certificateEmissionsRepositoryMock.update).not.toHaveBeenCalled()
    })
})
