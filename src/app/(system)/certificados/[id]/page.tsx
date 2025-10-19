import { GoBackButton } from '@/components/GoBackButton'
import { fetchMe } from '@/api-calls/fetch-me'
import { fetchCertificateEmission } from '@/api-calls/fetch-certificate-emission'
import { Badge } from '@/components/ui/badge'
import { TemplateSection } from './_components/TemplateSection'
import { DataSourceSection } from './_components/DataSourceSection'
import { VariableMappingSection } from './_components/VariableMappingSection'
import { EmailSendingSection } from './_components/EmailSendingSection'
import { GenerateCertificatesSection } from './_components/GenerateCertificatesSection'

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

    // TODO: Replace these with real data from API
    const hasTemplate =
        !!certificateEmissionResponse.certificateEmission.template
    const hasDataSource =
        !!certificateEmissionResponse.certificateEmission.dataSource
    const templateVariables =
        certificateEmissionResponse.certificateEmission.template?.variables ||
        []
    const dataSourceColumns =
        certificateEmissionResponse.certificateEmission.dataSource?.columns ||
        []
    const variablesMapped = false // TODO: Get from API
    const certificatesGenerated = false // TODO: Get from API
    const emailSent = false // TODO: Get from API
    const totalRecords = 3 // TODO: Get from API

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
                    rows={
                        certificateEmissionResponse.certificateEmission
                            .dataSource?.dataSet.rows || []
                    }
                />

                {hasTemplate &&
                    hasDataSource &&
                    templateVariables.length > 0 && (
                        <VariableMappingSection
                            certificateId={certificateId}
                            templateVariables={templateVariables}
                            dataSourceColumns={dataSourceColumns}
                            certificatesGenerated={certificatesGenerated}
                            totalRecords={totalRecords}
                            existingMappings={
                                certificateEmissionResponse.certificateEmission
                                    .variableColumnMapping
                            }
                        />
                    )}

                <GenerateCertificatesSection
                    certificateId={certificateId}
                    variablesMapped={
                        variablesMapped || templateVariables.length === 0
                    }
                    certificatesGenerated={certificatesGenerated}
                    totalRecords={totalRecords}
                />

                {hasTemplate && hasDataSource && (
                    <EmailSendingSection
                        certificateId={certificateId}
                        dataSourceColumns={dataSourceColumns}
                        variablesMapped={
                            variablesMapped || templateVariables.length === 0
                        }
                        emailSent={emailSent}
                    />
                )}
            </div>

            {/* // </div> */}
        </>
    )
}
