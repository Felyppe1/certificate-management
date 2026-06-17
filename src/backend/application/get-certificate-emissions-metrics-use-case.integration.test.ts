import { describe, it, expect } from 'vitest'
import { GetCertificateEmissionsMetricsUseCase } from './get-certificate-emissions-metrics-use-case'
import { PrismaCertificatesRepository } from '@/backend/infrastructure/repository/prisma/prisma-certificates-repository'
import { prisma } from '@/tests/setup.integration'
import { CERTIFICATE_STATUS } from '@/backend/domain/certificate'

function makeUseCase() {
    return new GetCertificateEmissionsMetricsUseCase(
        new PrismaCertificatesRepository(prisma),
    )
}

describe('GetCertificateEmissionsMetricsUseCase (Integration)', () => {
    it('deve retornar métricas com zeros quando o usuário não tem dados', async () => {
        await prisma.user.create({
            data: {
                id: 'user-1',
                email: 'user@test.com',
                name: 'Usuário Teste',
                credits: 300,
            },
        })

        const result = await makeUseCase().execute({ userId: 'user-1' })

        expect(result.totalCertificatesGenerated).toBe(0)
        expect(result.totalEmailsSent).toBe(0)
        expect(result.dailyCertificates).toEqual([])
        expect(result.dailyEmails).toEqual([])
    })

    it('deve retornar os totais corretos quando existem registros de uso', async () => {
        await prisma.user.create({
            data: {
                id: 'user-1',
                email: 'user@test.com',
                name: 'Usuário Teste',
                credits: 300,
            },
        })

        const today = new Date()
        today.setHours(0, 0, 0, 0)

        await prisma.certificateEmission.create({
            data: {
                id: 'cert-1',
                title: 'Certificado 1',
                user_id: 'user-1',
                status: CERTIFICATE_STATUS.GENERATED,
            },
        })

        await prisma.dailyUsage.create({
            data: {
                user_id: 'user-1',
                date: today,
                certificates_generated_count: 5,
                emails_sent_count: 3,
            },
        })

        const result = await makeUseCase().execute({ userId: 'user-1' })

        expect(result.totalCertificatesGenerated).toBe(5)
        expect(result.totalEmailsSent).toBe(3)
        expect(result.dailyCertificates).toHaveLength(1)
        expect(result.dailyCertificates[0].quantity).toBe(5)
        expect(result.dailyEmails).toHaveLength(1)
        expect(result.dailyEmails[0].quantity).toBe(3)
    })
})
