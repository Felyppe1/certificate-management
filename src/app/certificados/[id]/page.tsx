// import { cookies } from 'next/headers'
// import { SetFileUrlForm } from './set-file-url-form'
// import UploadTemplateForm from './upload-template-form'

// export default async function CertificatePage({
//     params,
// }: {
//     params: Promise<{ id: string }>
// }) {
//     const { id: certificateId } = await params

//     const sessionToken = (await cookies()).get('session_token')!.value

//     const response = await fetch(
//         `${process.env.NEXT_PUBLIC_BASE_URL}/api/certificate-emissions/${certificateId}`,
//         {
//             headers: {
//                 Cookie: `session_token=${sessionToken}`,
//             },
//             next: {
//                 tags: ['certificate'],
//             },
//         },
//     )

//     const certificate = await response.json()
//     // TODO: what to do when it does not exist

//     // console.log(certificate)

//     return (
//         <div className="container mx-auto py-8 px-4 max-w-4xl">
//             <div className="mb-8">
//                 <h1 className="text-2xl font-bold text-gray-900 mb-2">
//                     {certificate.certificate.title}
//                 </h1>
//                 <p className="text-gray-600">
//                     Configure o template e os dados para gerar certificados
//                 </p>
//             </div>

//             <div className="space-y-8">
//                 <SetFileUrlForm
//                     template={certificate.certificate.template}
//                 />

//                 {/* Outros componentes podem ser adicionados aqui */}
//                 <UploadTemplateForm />
//             </div>
//         </div>
//     )
// }
