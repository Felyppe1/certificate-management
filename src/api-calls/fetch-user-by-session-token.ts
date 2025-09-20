import { cookies } from 'next/headers'

export async function fetchUserBySessionToken() {
    const sessionToken = (await cookies()).get('session_token')?.value

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/sessions`,
        {
            headers: {
                Cookie: `session_token=${sessionToken}`,
            },
            next: {
                tags: ['user'],
            },
        },
    )

    if (!response.ok) {
        return null
    }

    const data = await response.json()

    return data
}
