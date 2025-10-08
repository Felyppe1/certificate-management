import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'

export async function fetchCertificateEmission(certificateId: string) {
    const sessionToken = (await cookies()).get('session_token')?.value

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/certificate-emissions/${certificateId}`,
        {
            headers: {
                Cookie: `session_token=${sessionToken}`,
            },
            next: {
                tags: ['certificate'],
            },
        },
    )

    if (!response.ok) {
        if (response.status === 404) {
            notFound()
        }
    }

    return await response.json()
}
