import { describe, expect, it, vi, beforeEach, Mock } from 'vitest'
import { GetCertificateEmissionsMetricsUseCase } from './get-certificate-emissions-metrics-use-case'
import { ICertificatesRepository } from './interfaces/repository/write/icertificates-repository'

describe('GetCertificateEmissionsMetricsUseCase', () => {
    const USER_ID = 'user-1'

    let certificateEmissionsRepository: {
        getCertificateEmissionsMetricsByUserId: Mock<
            ICertificatesRepository['getCertificateEmissionsMetricsByUserId']
        >
    }

    beforeEach(() => {
        certificateEmissionsRepository = {
            getCertificateEmissionsMetricsByUserId: vi.fn(),
        }
    })

    function makeUseCase() {
        return new GetCertificateEmissionsMetricsUseCase(
            certificateEmissionsRepository,
        )
    }

    it('deve delegar ao repositório e retornar as métricas recebidas', async () => {
        const metrics = {
            totalCertificatesGenerated: 42,
            totalEmailsSent: 10,
            dailyCertificates: [{ date: new Date('2026-06-01'), quantity: 5 }],
            dailyEmails: [{ date: new Date('2026-06-01'), quantity: 2 }],
        }

        certificateEmissionsRepository.getCertificateEmissionsMetricsByUserId.mockResolvedValue(
            metrics,
        )

        const result = await makeUseCase().execute({ userId: USER_ID })

        expect(
            certificateEmissionsRepository.getCertificateEmissionsMetricsByUserId,
        ).toHaveBeenCalledWith(USER_ID)
        expect(result).toBe(metrics)
    })
})
