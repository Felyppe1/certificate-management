import { fetchCertificateEmissions } from '@/api-calls/fetch-certificate-emissions'
import { ListRenderer } from './ListRenderer'

export async function List() {
    const data = await fetchCertificateEmissions()

    return <ListRenderer certificateEmissions={data.certificateEmissions} />
}
