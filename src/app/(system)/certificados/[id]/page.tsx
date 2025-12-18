import { GoBackButton } from '@/components/GoBackButton'
import { fetchMe } from '@/api-calls/fetch-me'
import { fetchCertificateEmission } from '@/api-calls/fetch-certificate-emission'
import { Badge } from '@/components/ui/badge'
import { TemplateSection } from './_components/TemplateSection'
import { DataSourceSection } from './_components/DataSourceSection'
import { VariableMappingSection } from './_components/VariableMappingSection'
import { EmailSendingSection } from './_components/EmailSendingSection'
import { GenerateCertificatesSection } from './_components/GenerateCertificatesSection'
import { GENERATION_STATUS } from '@/backend/domain/data-set'
import { TipsButton } from './_components/TipsButton'

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
    const dataSet =
        certificateEmissionResponse.certificateEmission.dataSource?.dataSet ??
        null
    const email = certificateEmissionResponse.certificateEmission.email
    const variablesMapped =
        templateVariables.length === 0
            ? true
            : Object.values(
                  certificateEmissionResponse.certificateEmission
                      .variableColumnMapping,
              ).every(mapping => mapping !== null)
    const hasVariables = templateVariables.length === 0 ? false : true
    const hasRows = dataSet && dataSet.rows.length > 0

    const emailSent = (email && !email.scheduledAt) || false

    return (
        <>
            {/* // <div className="container mx-auto pb-8 px-4 max-w-4xl"> */}
            <div className="flex justify-between">
                <GoBackButton />
                <TipsButton />
            </div>
            <div className="flex flex-col gap-4 sm:gap-6 md:gap-8 mt-4 xs:mt-6 md:mt-8 mb-12">
                <div>
                    <div className="flex items-center gap-4 mb-4">
                        <h1 className="text-3xl sm:text-4xl font-bold">
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
                    <p className="text-foreground/90 text-base sm:text-lg font-light">
                        Configure o template e os dados para gerar certificados
                    </p>
                </div>

                <TemplateSection
                    userEmail={meResponse.user.email}
                    googleOAuthToken={googleAccount?.accessToken || null}
                    googleOAuthTokenExpiry={
                        googleAccount?.accessTokenExpiryDateTime || null
                    }
                    certificateId={certificateId}
                    template={
                        certificateEmissionResponse.certificateEmission.template
                    }
                    emailSent={emailSent}
                    certificatesGenerated={
                        dataSet?.generationStatus ===
                        GENERATION_STATUS.COMPLETED
                    }
                />

                <DataSourceSection
                    userEmail={meResponse.user.email}
                    googleOAuthToken={googleAccount?.accessToken || null}
                    googleOAuthTokenExpiry={
                        googleAccount?.accessTokenExpiryDateTime || null
                    }
                    certificateId={certificateId}
                    dataSource={
                        certificateEmissionResponse.certificateEmission
                            .dataSource
                    }
                    emailSent={emailSent}
                />

                {hasTemplate && hasDataSource && hasVariables && (
                    <VariableMappingSection
                        certificateId={certificateId}
                        templateVariables={templateVariables}
                        dataSourceColumns={dataSourceColumns}
                        currentMapping={
                            certificateEmissionResponse.certificateEmission
                                .variableColumnMapping
                        }
                        emailSent={emailSent}
                        certificatesGenerated={
                            dataSet?.generationStatus ===
                            GENERATION_STATUS.COMPLETED
                        }
                    />
                )}

                {hasTemplate && hasDataSource && variablesMapped && hasRows && (
                    <GenerateCertificatesSection
                        certificateId={certificateId}
                        allVariablesWereMapped={
                            variablesMapped || templateVariables.length === 0
                        }
                        dataSet={dataSet}
                        emailSent={emailSent}
                    />
                )}

                {hasTemplate && hasDataSource && variablesMapped && hasRows && (
                    <EmailSendingSection
                        certificateId={certificateId}
                        dataSourceColumns={dataSourceColumns}
                        variablesMapped={
                            variablesMapped || templateVariables.length === 0
                        }
                        emailSent={emailSent}
                        totalRecipients={dataSet?.rows.length || 0}
                        certificatesGenerated={
                            dataSet?.generationStatus ===
                            GENERATION_STATUS.COMPLETED
                        }
                        emailData={
                            email
                                ? {
                                      subject: email.subject,
                                      body: email.body,
                                      emailColumn: email.emailColumn,
                                      scheduledAt: email.scheduledAt,
                                  }
                                : null
                        }
                    />
                )}
            </div>

            {/* // </div> */}
        </>
    )
}
