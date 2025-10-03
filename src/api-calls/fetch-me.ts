import { GetMeControllerResponse } from '@/app/api/users/me/route'
import { cookies } from 'next/headers'

export async function fetchMe(): Promise<GetMeControllerResponse> {
    console.log('fetchMe')
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

    return await response.json()
}
