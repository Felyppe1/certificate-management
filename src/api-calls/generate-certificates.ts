import { cookies } from 'next/headers'

interface GenerateCertificatesResponse {
    success: boolean
    message: string
}

export async function generateCertificates(
    certificateEmissionId: string,
): Promise<GenerateCertificatesResponse> {
    const sessionToken = (await cookies()).get('session_token')?.value

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/certificate-emissions/${certificateEmissionId}/generate`,
        {
            method: 'POST',
            headers: {
                Cookie: `session_token=${sessionToken}`,
                'Content-Type': 'application/json',
            },
        },
    )

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'Failed to generate certificates')
    }

    return await response.json()
}
