import { cookies } from 'next/headers'

export async function fetchCertificateEmissions() {
    const sessionToken = (await cookies()).get('session_token')?.value

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/certificate-emissions`,
        {
            headers: {
                Cookie: `session_token=${sessionToken}`,
            },
            next: {
                tags: ['certificates'],
            },
        },
    )

    return await response.json()
}
