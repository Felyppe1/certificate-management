import { GoBackButton } from '@/components/GoBackButton'
import { fetchMe } from '@/api-calls/fetch-me'
import { fetchCertificateEmission } from '@/api-calls/fetch-certificate-emission'
import { TemplateSection } from './_components/TemplateSection'
import { DataSourceSection } from './_components/DataSourceSection'
import { VariableMappingSection } from './_components/VariableMappingSection'
import { EmailSendingSection } from './_components/EmailSendingSection'
import { GenerateCertificatesSection } from './_components/GenerateCertificatesSection'
import { PROCESSING_STATUS_ENUM } from '@/backend/domain/data-source-row'
import { TipsButton } from './_components/TipsButton'
import { CertificateHeader } from './_components/CertificateHeader'

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
    const dataSourceColumnNames = dataSourceColumns.map(col => col.name)
    const rows =
        certificateEmissionResponse.certificateEmission.dataSource?.rows ?? []
    const email = certificateEmissionResponse.certificateEmission.email
    const hasTemplateVariables = templateVariables.length === 0 ? false : true
    console.log('hasTemplateVariables', hasTemplateVariables)
    console.log(
        'certificateEmissionResponse.certificateEmission.variableColumnMapping',
        certificateEmissionResponse.certificateEmission.variableColumnMapping,
    )
    const variablesMapped = hasTemplateVariables
        ? Object.values(
              certificateEmissionResponse.certificateEmission
                  .variableColumnMapping!,
          ).every(mapping => mapping !== null)
        : false

    // Certificates are generated if all rows have processingStatus of COMPLETED or FAILED
    const certificatesGenerated =
        rows.length > 0 &&
        rows.every(
            row =>
                row.processingStatus === PROCESSING_STATUS_ENUM.COMPLETED ||
                row.processingStatus === PROCESSING_STATUS_ENUM.FAILED,
        )

    const emailSent = (email && !email.scheduledAt) || false

    return (
        <>
            <div className="px-2">
                <div className="flex justify-between">
                    <GoBackButton />
                    <TipsButton />
                </div>
                <CertificateHeader
                    certificateId={certificateId}
                    initialName={
                        certificateEmissionResponse.certificateEmission.name
                    }
                    status={
                        certificateEmissionResponse.certificateEmission.status
                    }
                />
            </div>
            <div className="flex flex-col gap-2 sm:gap-5 md:gap-8 mt-4 xs:mt-6 md:mt-8 mb-12">
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
                    certificatesGenerated={certificatesGenerated}
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

                {hasTemplate && hasDataSource && hasTemplateVariables && (
                    <VariableMappingSection
                        certificateId={certificateId}
                        templateVariables={templateVariables}
                        dataSourceColumns={dataSourceColumnNames}
                        currentMapping={
                            certificateEmissionResponse.certificateEmission
                                .variableColumnMapping!
                        }
                        emailSent={emailSent}
                        certificatesGenerated={certificatesGenerated}
                    />
                )}

                {hasTemplate && hasDataSource && variablesMapped && (
                    <GenerateCertificatesSection
                        certificateId={certificateId}
                        allVariablesWereMapped={variablesMapped}
                        rows={rows}
                        emailSent={emailSent}
                        certificatesGenerated={certificatesGenerated}
                    />
                )}

                {hasTemplate && hasDataSource && variablesMapped && (
                    <EmailSendingSection
                        certificateId={certificateId}
                        dataSourceColumns={dataSourceColumnNames}
                        variablesMapped={variablesMapped}
                        emailSent={emailSent}
                        totalRecipients={rows.length}
                        certificatesGenerated={certificatesGenerated}
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
