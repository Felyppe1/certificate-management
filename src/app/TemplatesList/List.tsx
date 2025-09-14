import { fetchTemplates } from '@/api-calls/fetch-templates'
import Link from 'next/link'

export async function List() {
    const data = await fetchTemplates()

    if (data.templates.length === 0) {
        return <p className="text-gray-600">Você ainda não possui template</p>
    }

    return (
        <ul className="flex gap-6 flex-wrap">
            {data.templates.map((template: any) => (
                <li key={template.id}>
                    <Link href={`/templates/${template.id}`}>
                        {template.fileName}
                    </Link>
                </li>
            ))}
        </ul>
    )
}
