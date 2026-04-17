import { env } from '@/env'
import { SESSION_COOKIE_NAME } from '@/app/api/_utils/constants'

import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'

export async function fetchCertificateEmissionsMetricsByUser() {
    const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value

    const response = await fetch(
        `${env.NEXT_PUBLIC_BASE_URL}/api/certificate-emissions/metrics`,
        {
            headers: {
                Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
            },
            next: {
                tags: ['certificate-emissions-metrics-by-user'],
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

        if (response.status === 401) {
            const query = errorType ? `?error=${errorType}` : ''
            redirect(`/entrar${query}`)
        }

        throw {
            statusCode: response.status,
            body: errorData,
        }
    }

    return await response.json()
}
