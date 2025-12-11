import { cookies } from 'next/headers'

export interface CertificateEmissionsResponse {
    certificateEmissions: Array<{
        id: string
        name: string
        userId: string
        status: string
        createdAt: Date
    }>
}

export async function fetchCertificateEmissions() {
    const sessionToken = (await cookies()).get('session_token')?.value

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/certificate-emissions`,
        {
            headers: {
                Cookie: `session_token=${sessionToken}`,
            },
            next: {
                tags: ['certificate-emissions'],
            },
        },
    )

    return (await response.json()) as CertificateEmissionsResponse
}
