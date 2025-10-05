import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { FileText, ArrowLeft } from 'lucide-react'

export default function TemplateNotFound() {
    return (
        <div className="container mx-auto py-16 px-4 max-w-2xl text-center">
            <div className="flex justify-center mb-6">
                <div className="p-4 bg-gray-100 rounded-full">
                    <FileText className="h-12 w-12 text-gray-400" />
                </div>
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Template não encontrado
            </h1>

            <p className="text-lg text-gray-600 mb-8">
                O template que você está procurando não existe ou foi removido.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/templates">
                    <Button variant="outline">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar aos Templates
                    </Button>
                </Link>
                <Link href="/templates/criar">
                    <Button>Criar Novo Template</Button>
                </Link>
            </div>
        </div>
    )
}
