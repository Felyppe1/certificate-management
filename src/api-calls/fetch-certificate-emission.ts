import { GetCertificateEmissionControllerResponse } from '@/app/api/certificate-emissions/[certificateEmissionId]/route'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

export async function fetchCertificateEmission(
    certificateId: string,
): Promise<GetCertificateEmissionControllerResponse> {
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
        const errorData = await response.json()

        const errorType =
            errorData.type !== 'about:blank' ? errorData.type : null

        if (response.status === 404) {
            notFound()
        }

        if (response.status === 403) {
            const query = errorType ? `?error=${errorType}` : ''
            redirect(`/${query}`)
        }

        throw new Error(
            'Error getting certificate emission: ' + response.statusText,
        )
    }

    return await response.json()
}
