import { cookies } from 'next/headers'

export async function fetchCertificateEmissionsMetricsByUser() {
    const sessionToken = (await cookies()).get('session_token')?.value

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/certificate-emissions/metrics`,
        {
            headers: {
                Cookie: `session_token=${sessionToken}`,
            },
            next: {
                tags: ['certificate-emissions-metrics-by-user'],
            },
        },
    )

    return await response.json()
}
