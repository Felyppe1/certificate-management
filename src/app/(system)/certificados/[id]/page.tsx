import { GoBackButton } from '@/components/GoBackButton'
import { TemplateSection } from './template-section'
import { fetchMe } from '@/api-calls/fetch-me'
import { fetchCertificateEmission } from '@/api-calls/fetch-certificate-emission'

export default async function CertificatePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id: certificateId } = await params

    // TODO: what to do when it throws an error
    const certificateEmissionResponse =
        await fetchCertificateEmission(certificateId)

    const meResponse = await fetchMe()

    const googleAccount = meResponse.user.externalAccounts.find(
        externalAccount => externalAccount.provider === 'GOOGLE',
    )

    return (
        <div className="container mx-auto pb-8 px-4 max-w-4xl">
            <GoBackButton />
            <div className="my-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {certificateEmissionResponse.certificateEmission.name}
                </h1>
                <p className="text-gray-600">
                    Configure o template e os dados para gerar certificados
                </p>
            </div>

            <TemplateSection
                googleOAuthToken={googleAccount?.accessToken || null}
                certificateId={certificateId}
                template={
                    certificateEmissionResponse.certificateEmission.template
                }
            />
        </div>
    )
}
