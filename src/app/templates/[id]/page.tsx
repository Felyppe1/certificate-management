import { fetchTemplateById } from '@/api-calls/fetch-template-by-id'
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { notFound } from 'next/navigation'
import { Tag, User } from 'lucide-react'
import { TemplateActions } from './template-actions'
import Image from 'next/image'
import { GoBackButton } from '@/components/GoBackButton'

interface Template {
    id: string
    fileName: string
    fileExtension: 'DOCX' | 'GOOGLE_DOCS' | 'PPTX' | 'GOOGLE_SLIDES'
    variables: string[]
    driveFileId: string | null
    storageFileUrl: string | null
    inputMethod: 'URL' | 'GOOGLE_DRIVE' | 'UPLOAD'
}

interface TemplateResponse {
    template: Template
}

function getFileExtensionColor(extension: string) {
    switch (extension) {
        case 'DOCX':
            return 'bg-blue-100 text-blue-800'
        case 'GOOGLE_DOCS':
            return 'bg-blue-100 text-blue-800'
        case 'PPTX':
            return 'bg-orange-100 text-orange-800'
        case 'GOOGLE_SLIDES':
            return 'bg-orange-100 text-orange-800'
        default:
            return 'bg-gray-100 text-gray-800'
    }
}

function getInputMethodLabel(method: string) {
    switch (method) {
        case 'URL':
            return 'Link Público'
        case 'GOOGLE_DRIVE':
            return 'Google Drive'
        case 'UPLOAD':
            return 'Upload'
        default:
            return method
    }
}

// function getFileTypeIcon(extension: string) {
//     switch (extension) {
//         case 'DOCX':
//         case 'GOOGLE_DOCS':
//             return <FileText className="h-5 w-5" />
//         case 'PPTX':
//         case 'GOOGLE_SLIDES':
//             return <ImageIcon className="h-5 w-5" />
//         default:
//             return <FileText className="h-5 w-5" />
//     }
// }

export default async function TemplateDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id: templateId } = await params

    // const router = useRouter();

    let data: TemplateResponse

    try {
        data = await fetchTemplateById(templateId)
    } catch {
        notFound()
    }

    if (!data?.template) {
        notFound()
    }

    const { template } = data

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="mb-8">
                <GoBackButton />

                <div className="mt-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Detalhes do Template
                    </h1>
                    <p className="text-gray-600">
                        Visualize e gerencie os dados do seu template
                    </p>
                </div>
            </div>

            <div className="grid gap-6">
                {/* Card Principal do Template */}
                <Card>
                    <CardHeader>
                        <div className="flex items-start gap-4">
                            {/* Miniatura fictícia */}
                            <Image
                                src="https://lh3.googleusercontent.com/drive-storage/AJQWtBNBRyT7s751LboHHdoIEg_FlQyPAsVzwEhrvxcaxXBd5ITPXNmWioZcfnTZ43E34l4mxD6yjzsLgj1XlUdJtKrCe7GIY0u7FuYJrqvzIWZF5bc-mYqVDQM-uRjvVw=s220"
                                alt="Thumbnail do template"
                                width={128}
                                height={128}
                            />
                            {/* <div className="w-24 h-32 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg flex items-center justify-center flex-shrink-0">
                                <div className="text-center">
                                    {getFileTypeIcon(template.fileExtension)}
                                    <div className="text-xs text-blue-600 mt-1 font-medium">
                                        {template.fileExtension === 'GOOGLE_DOCS' ? 'DOCS' : 
                                         template.fileExtension === 'GOOGLE_SLIDES' ? 'SLIDES' :
                                         template.fileExtension}
                                    </div>
                                </div>
                            </div> */}

                            <div className="flex-1 min-w-0">
                                <CardTitle className="text-xl mb-2 break-words">
                                    {template.fileName}
                                </CardTitle>
                                <CardDescription className="mb-4">
                                    Template para geração de certificados
                                </CardDescription>

                                <div className="flex flex-wrap gap-2 mb-4">
                                    <Badge
                                        variant="secondary"
                                        className={getFileExtensionColor(
                                            template.fileExtension,
                                        )}
                                    >
                                        {template.fileExtension ===
                                        'GOOGLE_DOCS'
                                            ? 'Google Docs'
                                            : template.fileExtension ===
                                                'GOOGLE_SLIDES'
                                              ? 'Google Slides'
                                              : template.fileExtension}
                                    </Badge>
                                    <Badge variant="outline">
                                        {getInputMethodLabel(
                                            template.inputMethod,
                                        )}
                                    </Badge>
                                </div>

                                <TemplateActions
                                    inputMethod={template.inputMethod}
                                    driveFileId={template.driveFileId}
                                    storageFileUrl={template.storageFileUrl}
                                />
                            </div>
                        </div>
                    </CardHeader>
                </Card>

                {/* Variáveis do Template */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <User className="h-5 w-5" />
                            Variáveis do Template
                        </CardTitle>
                        <CardDescription>
                            Variáveis identificadas no template que serão
                            substituídas na geração dos certificados
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {template.variables.length > 0 ? (
                            <div className="space-y-4">
                                <div className="flex flex-wrap gap-2">
                                    {template.variables.map(
                                        (variable, index) => (
                                            <Badge
                                                key={index}
                                                variant="outline"
                                                className="font-mono"
                                            >
                                                {`{{${variable}}}`}
                                            </Badge>
                                        ),
                                    )}
                                </div>
                                <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                                    <p className="font-medium text-blue-900 mb-1">
                                        Como usar:
                                    </p>
                                    <p>
                                        Essas variáveis serão substituídas pelos
                                        dados reais durante a geração dos
                                        certificados. Por exemplo,{' '}
                                        <code className="bg-blue-100 px-1 rounded">{`{{nome}}`}</code>{' '}
                                        será substituído pelo nome da pessoa.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <Tag className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p>Nenhuma variável encontrada no template</p>
                                <p className="text-sm mt-1">
                                    Variáveis devem estar no formato{' '}
                                    <code className="bg-gray-100 px-1 rounded">{`{{variavel}}`}</code>
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
