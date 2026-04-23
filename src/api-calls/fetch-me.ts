import { env } from '@/env'
import { SESSION_COOKIE_NAME } from '@/app/api/_utils/constants'

import { GetMeControllerResponse } from '@/app/api/users/me/route'
import { cookies } from 'next/headers'

export async function fetchMe(): Promise<GetMeControllerResponse> {
    const sessionToken = (await cookies()).get(SESSION_COOKIE_NAME)?.value

    const response = await fetch(`${env.NEXT_PUBLIC_BASE_URL}/api/users/me`, {
        headers: {
            Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        },
        next: {
            tags: ['me'],
        },
    })

    if (!response.ok) {
        const errorData = await response.json()

        throw {
            statusCode: response.status,
            body: errorData,
        }
    }

    return await response.json()
}
