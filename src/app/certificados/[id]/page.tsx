import { cookies } from 'next/headers'
import { GoBackButton } from '@/components/GoBackButton'
import { TemplateSection } from './template-section'

export default async function CertificatePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id: certificateId } = await params

    const sessionToken = (await cookies()).get('session_token')!.value

    const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/certificate-emissions/${certificateId}`,
        {
            headers: {
                Cookie: `session_token=${sessionToken}`,
            },
            next: {
                tags: ['certificate'],
            },
        },
    )

    const data = await response.json()
    // TODO: what to do when it does not exist

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <GoBackButton />
            <div className="my-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {data.certificateEmission.name}
                </h1>
                <p className="text-gray-600">
                    Configure o template e os dados para gerar certificados
                </p>
            </div>

            <TemplateSection
                certificateId={certificateId}
                template={data.certificateEmission.template}
            />
        </div>
    )
}
