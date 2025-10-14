import { GoBackButton } from '@/components/GoBackButton'
import { fetchMe } from '@/api-calls/fetch-me'
import { fetchCertificateEmission } from '@/api-calls/fetch-certificate-emission'
import { Badge } from '@/components/ui/badge'
import { TemplateSection } from './_components/TemplateSection'
import { DataSourceSection } from './_components/DataSourceSection'

const statusMapping = {
    DRAFT: 'Rascunho',
    EMITTED: 'Emitido',
    SCHEDULED: 'Agendado',
}

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
        <>
            {/* // <div className="container mx-auto pb-8 px-4 max-w-4xl"> */}
            <GoBackButton />
            <div className="flex flex-col gap-8 mt-8 mb-12">
                <div>
                    <div className="flex items-center gap-4 mb-4">
                        <h1 className="text-3xl md:text-4xl font-bold">
                            {
                                certificateEmissionResponse.certificateEmission
                                    .name
                            }
                        </h1>
                        <Badge
                            variant={
                                certificateEmissionResponse.certificateEmission
                                    .status === 'EMITTED'
                                    ? 'green'
                                    : certificateEmissionResponse
                                            .certificateEmission.status ===
                                        'DRAFT'
                                      ? 'orange'
                                      : 'purple'
                            }
                            size="lg"
                        >
                            {
                                statusMapping[
                                    certificateEmissionResponse
                                        .certificateEmission
                                        .status as keyof typeof statusMapping
                                ]
                            }
                        </Badge>
                    </div>
                    <p className="text-foreground/90 text-lg font-light">
                        Configure o template e os dados para gerar certificados
                    </p>
                </div>

                <TemplateSection
                    googleOAuthToken={googleAccount?.accessToken || null}
                    googleOAuthTokenExpiry={
                        googleAccount?.accessTokenExpiryDateTime || null
                    }
                    certificateId={certificateId}
                    template={
                        certificateEmissionResponse.certificateEmission.template
                    }
                />

                <DataSourceSection
                    googleOAuthToken={googleAccount?.accessToken || null}
                    googleOAuthTokenExpiry={
                        googleAccount?.accessTokenExpiryDateTime || null
                    }
                    certificateId={certificateId}
                    dataSource={
                        certificateEmissionResponse.certificateEmission
                            .dataSource
                    }
                />
            </div>

            {/* // </div> */}
        </>
    )
}
