import { cookies } from 'next/headers'
import Link from 'next/link'

export async function CertificatesList() {
    const sessionToken = (await cookies()).get('session_token')!.value

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/certificate-emissions`,
        {
            headers: {
                Cookie: `session_token=${sessionToken}`,
            },
            next: {
                tags: ['certificates'],
            },
        },
    )

    const data = await response.json()

    return (
        <div>
            <h2 className="text-2xl font-bold">Seus certificados</h2>
            <ul>
                {data.certificates.map((certificate: any) => (
                    <li key={certificate.id}>
                        <Link href={`/certificados/${certificate.id}`}>
                            {certificate.title}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}
