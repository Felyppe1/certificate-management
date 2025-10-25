import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

interface AddTemplateByUrlOutput {
    type: 'certificate-not-found' | 'about:blank'
    title: string
}

export async function addTemplateByUrl(
    certificateId: string,
    fileUrl: string,
): Promise<void> {
    const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/certificates/${certificateId}/templates`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileUrl }),
        },
    )

    const data = await response.json()

    if (!response.ok) {
        if (response.status === 401) {
            const cookie = await cookies()

            cookie.delete('session_token')

            redirect('/login')
        }

        if (data.type === 'certificate-not-found') {
            console.log('Certificado não encontrado')
            return
        }

        console.log('Ocorreu um erro ao adicionar ')
    }

    return response.json()
}
