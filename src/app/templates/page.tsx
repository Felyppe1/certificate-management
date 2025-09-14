import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'
import { fetchTemplates } from '@/api-calls/fetch-templates'

export default async function TemplatesPage() {
    const data = await fetchTemplates()

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <Link href="/">
                <Button variant="outline">
                    <ArrowLeft className="w-4 h-4" />
                    Voltar
                </Button>
            </Link>

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Meus Templates
                    </h1>
                    <p className="text-gray-600">
                        Gerencie seus templates de certificados
                    </p>
                </div>
                <Link href="/templates/criar">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Template
                    </Button>
                </Link>
            </div>

            <ul>
                {data.templates.map((template: any) => (
                    <li key={template.id}>
                        <Link href={`/templates/${template.id}`}>
                            {template.fileName}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}
