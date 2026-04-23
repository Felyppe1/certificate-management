import { env } from '@/env'
import { SESSION_COOKIE_NAME } from '@/app/api/_utils/constants'

import { GetCertificateEmissionControllerResponse } from '@/app/api/certificate-emissions/[certificateEmissionId]/route'
import { cookies } from 'next/headers'

export async function fetchCertificateEmission(
    certificateId: string,
): Promise<GetCertificateEmissionControllerResponse> {
    const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value

    const response = await fetch(
        `${env.NEXT_PUBLIC_BASE_URL}/api/certificate-emissions/${certificateId}`,
        {
            headers: {
                Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
            },
            next: {
                tags: ['certificate'],
            },
        },
    )

    if (!response.ok) {
        const errorData = await response.json()

        throw {
            statusCode: response.status,
            body: errorData,
        }
    }

    return await response.json()
}
