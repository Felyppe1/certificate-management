'use client'

import { GoBackButton } from '@/components/GoBackButton'
import { TemplateSection } from './components/TemplateSection'
import { DataSourceSection } from './components/DataSourceSection'
import { VariableMappingSection } from './components/VariableMappingSection'
import { EmailSendingSection } from './components/EmailSendingSection'
import { GenerateCertificatesSection } from './components/GenerateCertificatesSection'
import { PROCESSING_STATUS_ENUM } from '@/backend/domain/data-source-row'
import { TipsButton } from './components/TipsButton'
import { CertificateHeader } from './components/CertificateHeader'
import { useCertificateEmission } from '@/custom-hooks/use-certificate-emission'
import { useMe } from '@/custom-hooks/use-me'

export function CertificatePageClient({
    certificateId,
}: {
    certificateId: string
}) {
    const { data: certificateEmissionResponse } =
        useCertificateEmission(certificateId)
    const { data: meResponse } = useMe()

    if (!certificateEmissionResponse || !meResponse) {
        return null
    }

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
    const rows =
        certificateEmissionResponse.certificateEmission.dataSource?.rows ?? []
    const email = certificateEmissionResponse.certificateEmission.email
    const hasTemplateVariables = templateVariables.length === 0 ? false : true
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
        <div>
            <div className="flex justify-between px-3">
                <GoBackButton />
                <TipsButton />
            </div>
            <CertificateHeader
                certificateId={certificateId}
                initialName={
                    certificateEmissionResponse.certificateEmission.name
                }
                status={certificateEmissionResponse.certificateEmission.status}
            />

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
                    certificatesEmitted={emailSent}
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
                        dataSourceColumns={dataSourceColumns}
                        currentMapping={
                            certificateEmissionResponse.certificateEmission
                                .variableColumnMapping!
                        }
                        emailSent={emailSent}
                        certificatesGenerated={certificatesGenerated}
                    />
                )}

                {hasTemplate &&
                    hasDataSource &&
                    (!hasTemplateVariables || variablesMapped) && (
                        <GenerateCertificatesSection
                            certificateId={certificateId}
                            allVariablesWereMapped={
                                !hasTemplateVariables || variablesMapped
                            }
                            rows={rows}
                            emailSent={emailSent}
                        />
                    )}

                {hasTemplate &&
                    hasDataSource &&
                    (!hasTemplateVariables || variablesMapped) && (
                        <EmailSendingSection
                            certificateId={certificateId}
                            dataSourceColumns={dataSourceColumns
                                .filter(col => col.type === 'string')
                                .map(col => col.name)}
                            variablesMapped={
                                !hasTemplateVariables || variablesMapped
                            }
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
        </div>
    )
}
