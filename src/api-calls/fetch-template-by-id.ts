import { cookies } from 'next/headers'

export async function fetchTemplateById(templateId: string) {
    const sessionToken = (await cookies()).get('session_token')?.value

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/templates/${templateId}`,
        {
            headers: {
                Cookie: `session_token=${sessionToken}`,
            },
            next: {
                tags: ['templates'],
            },
        },
    )

    const data = await response.json()

    return data
}
