import { fetchCertificateEmissions } from '@/api-calls/fetch-certificate-emissions'
import Link from 'next/link'

export async function List() {
    const data = await fetchCertificateEmissions()

    if (data.certificateEmissions.length === 0) {
        return (
            <p className="text-gray-600">
                Nenhuma emissão de certificado criada
            </p>
        )
    }

    return (
        <>
            <ul>
                {data.certificateEmissions.map((certificate: any) => (
                    <li key={certificate.id}>
                        <Link href={`/certificados/${certificate.id}`}>
                            {certificate.title}
                        </Link>
                    </li>
                ))}
            </ul>
        </>
    )
}
