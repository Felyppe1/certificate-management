import { describe, expect, it, vi } from 'vitest'
import { CreateCertificateEmissionUseCase } from './create-certificate-emission-use-case'
import { ICertificatesRepository } from './interfaces/repository/icertificates-repository'
import { CertificateEmission } from '../domain/certificate'

describe('CreateCertificateEmissionUseCase', () => {
    const USER_ID = '1'

    it('deve criar a emissão de certificado com sucesso', async () => {
        const certificatesRepositoryMock: Pick<ICertificatesRepository, 'save'> = {
            save: vi.fn(),
        }

        const useCase = new CreateCertificateEmissionUseCase(certificatesRepositoryMock)

        const id = await useCase.execute({ name: 'Meu Certificado', userId: USER_ID })

        expect(certificatesRepositoryMock.save).toHaveBeenCalledTimes(1)

        const savedCertificate = (certificatesRepositoryMock.save as ReturnType<typeof vi.fn>)
            .mock.calls[0][0] as CertificateEmission
        expect(savedCertificate.getName()).toBe('Meu Certificado')
        expect(savedCertificate.isOwner(USER_ID)).toBe(true)

        expect(typeof id).toBe('string')
        expect(id.length).toBeGreaterThan(0)
        expect(id).toBe(savedCertificate.getId())
    })
})