import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { List } from './List'
import { Suspense } from 'react'

export async function TemplatesList() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">Templates</h2>
                <Link href="/templates/criar">
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Template
                    </Button>
                </Link>
            </div>
            <Suspense fallback={<p>Carregando templates...</p>}>
                <List />
            </Suspense>
        </div>
    )
}
