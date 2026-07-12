import { describe, it, expect } from 'vitest'
import { CreateCertificateEmissionUseCase } from './create-certificate-emission-use-case'
import { PrismaCertificatesRepository } from '../interface-adapters/repository/prisma/write/prisma-certificates-repository'
import { prisma } from '@/tests/setup.integration'

describe('CreateCertificateEmissionUseCase (Integration)', () => {
    it('deve criar emissão e persistir todos os campos no banco', async () => {
        await prisma.user.create({
            data: {
                id: '1',
                email: 'user@example.com',
                name: 'User',
                password_hash: 'hash',
            },
        })

        const useCase = new CreateCertificateEmissionUseCase(
            new PrismaCertificatesRepository(prisma),
        )

        const id = await useCase.execute({
            name: 'Meu Certificado',
            userId: '1',
        })

        const record = await prisma.certificateEmission.findUnique({
            where: { id },
        })

        expect(record).not.toBeNull()
        expect(record?.title).toBe('Meu Certificado')
        expect(record?.user_id).toBe('1')
        expect(record?.status).toBe('DRAFT')
        expect(record?.created_at).toBeInstanceOf(Date)
    })
})
