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
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/certificates/${certificateId}`,
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
    // TODO: what to do when it does not exist

    console.log(certificate)

    return (
        <div>
            <p>Título: {certificate.certificate.title}</p>
            <p>Id do arquivo: {certificate.certificate.template?.fileId}</p>
            <p>Nome do arquivo: {certificate.certificate.template?.fileName}</p>
            <p>
                Variáveis:{' '}
                {certificate.certificate.template?.variables?.join(', ')}
            </p>
            <UploadTemplateForm />
            <SetFileUrlForm certificateId={certificateId} />
        </div>
    )
}
