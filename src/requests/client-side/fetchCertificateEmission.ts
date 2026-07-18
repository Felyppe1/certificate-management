import { GetCertificateEmissionResponse } from '@/app/api/certificate-emissions/[certificateEmissionId]/route'
import { ApiError } from '@/app/api/_utils/api-error'

export async function fetchCertificateEmission(
    certificateId: string,
): Promise<GetCertificateEmissionResponse> {
    const response = await fetch(`/api/certificate-emissions/${certificateId}`)

    const data = await response.json()

    if (!response.ok) {
        throw new ApiError(response.status, data)
    }

    return data
}
