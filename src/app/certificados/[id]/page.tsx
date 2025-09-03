import { SetFileUrlForm } from './set-file-url-form'
import UploadTemplateForm from './upload-template-form'

export default async function CertificatePage() {
    return (
        <div>
            <UploadTemplateForm />
            <SetFileUrlForm />
        </div>
    )
}
