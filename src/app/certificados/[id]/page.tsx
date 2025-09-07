import { cookies } from 'next/headers'
import { SetFileUrlForm } from './set-file-url-form'
import UploadTemplateForm from './upload-template-form'

export default async function CertificatePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id: certificateId } = await params

    const sessionToken = (await cookies()).get('session_token')!.value

    const response = await fetch(
        `http://localhost:3000/api/certificates/${certificateId}`,
        {
            headers: {
                Cookie: `session_token=${sessionToken}`,
            },
            next: {
                tags: ['certificate'],
            },
        },
    )

    const certificate = await response.json()

    console.log(certificate)

    return (
        <div>
            {certificate.certificate.title}
            {certificate.certificate.template && (
                <div>{certificate.certificate.template.fileId}</div>
            )}
            <UploadTemplateForm />
            <SetFileUrlForm certificateId={certificateId} />
        </div>
    )
}
