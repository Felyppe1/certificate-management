// 'use client'

// import { startTransition, useState } from 'react'
// import { Badge } from '@/components/ui/badge'
// import { Button } from '@/components/ui/button'
// import {
//     Card,
//     CardContent,
//     CardHeader,
//     CardTitle,
//     CardAction,
// } from '@/components/ui/card'
// import { Input } from '@/components/ui/input'
// import { RefreshCw, Upload, Link, FileText, X } from 'lucide-react'
// import { useActionState } from 'react'
// import { createTemplateByUrlAction } from '@/server-actions/create-template-by-url-action'
// import { deleteTemplateAction } from '@/server-actions/delete-template-action'
// import { refreshTemplateAction } from '@/server-actions/refresh-template-by-url-action'

// interface CertificateTemplateCardProps {
//     template: {
//         id: string
//         fileId: string
//         fileName: string
//         variables: string[]
//     }
// }

// export function CertificateTemplateCard({
//     template,
// }: CertificateTemplateCardProps) {
//     const [isUrlMode, setIsUrlMode] = useState(false)
//     const [state, action, isPending] = useActionState(
//         createTemplateByUrlAction,
//         null,
//     )

//     const [deleteState, deleteAction, isDeleting] = useActionState(
//         deleteTemplateAction,
//         null,
//     )

//     const [refreshState, refreshAction, isRefreshing] = useActionState(
//         refreshTemplateAction,
//         null,
//     )

//     const handleRefreshTemplate = async () => {
//         const formData = new FormData()
//         formData.append('templateId', template.id)

//         startTransition(() => {
//             refreshAction(formData)
//         })
//     }

//     const handleRemoveTemplate = () => {
//         const formData = new FormData()
//         formData.append('templateId', template.id)

//         startTransition(() => {
//             deleteAction(formData)
//         })
//     }

//     return (
//         <Card className="w-full">
//             <CardHeader>
//                 <CardTitle className="flex items-center gap-2">
//                     <FileText className="h-5 w-5" />
//                     Template do Certificado
//                     {template && (
//                         <Button
//                             variant="outline"
//                             size="sm"
//                             onClick={handleRefreshTemplate}
//                             className="ml-auto"
//                         >
//                             <RefreshCw className="h-4 w-4" />
//                         </Button>
//                     )}
//                 </CardTitle>
//                 {template && (
//                     <CardAction>
//                         <Button
//                             variant="ghost"
//                             size="sm"
//                             onClick={handleRemoveTemplate}
//                             className="text-destructive hover:text-destructive"
//                             disabled={isDeleting}
//                         >
//                             <X className="h-4 w-4" />
//                             Remover
//                         </Button>
//                     </CardAction>
//                 )}
//             </CardHeader>

//             <CardContent className="space-y-6">
//                 {template ? (
//                     <>
//                         {/* Template Existente */}
//                         <div className="bg-green-50 border border-green-200 rounded-lg p-4">
//                             <div className="flex items-center gap-2 mb-2">
//                                 {/* <GoogleDrive className="h-4 w-4 text-green-600" /> */}
//                                 <span className="text-sm font-medium text-green-800">
//                                     Template Certificado - Google Docs
//                                 </span>
//                             </div>

//                             {template.fileName && (
//                                 <p className="text-sm text-gray-600 mb-2">
//                                     <strong>Nome do arquivo:</strong>{' '}
//                                     {template.fileName}
//                                 </p>
//                             )}

//                             {template.fileId && (
//                                 <p className="text-sm text-gray-600 mb-3">
//                                     <strong>ID do arquivo:</strong>{' '}
//                                     {template.fileId}
//                                 </p>
//                             )}

//                             {template.variables &&
//                                 template.variables.length > 0 && (
//                                     <div>
//                                         <p className="text-sm font-medium text-gray-700 mb-2">
//                                             Variáveis encontradas:
//                                         </p>
//                                         <div className="flex flex-wrap gap-2">
//                                             {template.variables.map(
//                                                 (variable, index) => (
//                                                     <Badge
//                                                         key={index}
//                                                         variant="secondary"
//                                                         className="text-xs"
//                                                     >
//                                                         {variable}
//                                                     </Badge>
//                                                 ),
//                                             )}
//                                         </div>
//                                     </div>
//                                 )}
//                         </div>
//                     </>
//                 ) : (
//                     <>
//                         {/* Opções para Upload/Link */}
//                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//                             {/* Upload Local */}
//                             <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer">
//                                 <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
//                                 <h3 className="font-medium text-gray-900 mb-1">
//                                     Upload Local
//                                 </h3>
//                                 <p className="text-sm text-gray-500">
//                                     Envie um arquivo .docx ou .pptx do seu
//                                     computador
//                                 </p>
//                             </div>

//                             {/* Google Drive */}
//                             <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors cursor-pointer">
//                                 {/* <GoogleDrive className="h-8 w-8 mx-auto mb-2 text-gray-400" /> */}
//                                 <h3 className="font-medium text-gray-900 mb-1">
//                                     Google Drive
//                                 </h3>
//                                 <p className="text-sm text-gray-500">
//                                     Selecione um arquivo do seu Google Drive
//                                 </p>
//                             </div>

//                             {/* Link de compartilhamento */}
//                             <div
//                                 className="border-2 border-blue-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer bg-blue-50"
//                                 onClick={() => setIsUrlMode(true)}
//                             >
//                                 <Link className="h-8 w-8 mx-auto mb-2 text-blue-600" />
//                                 <h3 className="font-medium text-blue-900 mb-1">
//                                     Link de compartilhamento
//                                 </h3>
//                                 <p className="text-sm text-blue-700">
//                                     Cole o link de um Google Docs ou Google
//                                     Slides
//                                 </p>
//                             </div>
//                         </div>

//                         {/* Formulário de URL */}
//                         {isUrlMode && (
//                             <div className="mt-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
//                                 <h4 className="font-medium text-blue-900 mb-3">
//                                     Link do arquivo
//                                 </h4>

//                                 {state?.success === false && state?.message && (
//                                     <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
//                                         <p className="text-sm text-red-800">
//                                             {state.message}
//                                         </p>
//                                     </div>
//                                 )}

//                                 <form action={action} className="space-y-4">
//                                     <Input
//                                         type="hidden"
//                                         name="templateId"
//                                         value={template.id}
//                                     />
//                                     <div>
//                                         <Input
//                                             type="url"
//                                             name="fileUrl"
//                                             id="fileUrl"
//                                             placeholder="Cole o link de compartilhamento do Google Docs ou Google Slides"
//                                             className="w-full"
//                                             required
//                                         />
//                                         <p className="text-xs text-blue-600 mt-1">
//                                             Cole o link de compartilhamento do
//                                             Google Docs ou Google Slides
//                                         </p>
//                                     </div>
//                                     <div className="flex gap-2">
//                                         <Button
//                                             type="submit"
//                                             disabled={isPending}
//                                         >
//                                             {isPending
//                                                 ? 'Confirmando...'
//                                                 : 'Confirmar'}
//                                         </Button>
//                                         <Button
//                                             type="button"
//                                             variant="outline"
//                                             onClick={() => setIsUrlMode(false)}
//                                         >
//                                             Cancelar
//                                         </Button>
//                                     </div>
//                                 </form>
//                             </div>
//                         )}
//                     </>
//                 )}
//             </CardContent>
//         </Card>
//     )
// }
