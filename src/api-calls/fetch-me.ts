import { GetMeControllerResponse } from '@/app/api/users/me/route'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function fetchMe(): Promise<GetMeControllerResponse> {
    const sessionToken = (await cookies()).get('session_token')?.value

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/users/me`,
        {
            headers: {
                Cookie: `session_token=${sessionToken}`,
            },
            next: {
                tags: ['me'],
            },
        },
    )

    if (!response.ok) {
        if (response.status === 401) {
            redirect('/entrar')
        }
    }

    return await response.json()
}
