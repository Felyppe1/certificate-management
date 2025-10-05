import { fetchCertificateEmissions } from '@/api-calls/fetch-certificate-emissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

export async function List() {
    const data = await fetchCertificateEmissions()

    if (data.certificateEmissions.length === 0) {
        return (
            <p className="text-gray-600">
                Nenhuma emissão de certificado criada
            </p>
        )
    }

    return (
        <>
            <ul className="divide-y divide-border">
                {data.certificateEmissions.map((certificate: any) => (
                    <li key={certificate.id}>
                        <Link
                            href={`/certificados/${certificate.id}`}
                            className="group block px-6 py-5 hover:bg-muted transition-all duration-100 cursor-pointer outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-md"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4 flex-1">
                                    {/* <Image
                                        src="https://lh3.googleusercontent.com/drive-storage/AJQWtBPSrjM0v6QZeTNNntjhQE6BO4grZ7Bv3L30_6Ld3KhUk7GmLgJs8oXmD-_ruLzF1JCQng9XYcgyKtqQTfh4bwhv6PxwGChnEOEMfi6YEGLwog=s220"
                                        alt="Thumbnail do template"
                                        width={120}
                                        height={80}
                                    /> */}

                                    <div className="flex-1">
                                        <h3 className="text-foreground font-semibold text-lg mb-1">
                                            {certificate.title}
                                        </h3>
                                        {/* <p className="text-muted-foreground text-sm">
                                            {certificate.participants ? (
                                                <>
                                                    {certificate.participants}{' '}
                                                    participantes
                                                </>
                                            ) : (
                                                <>Não há base de dados</>
                                            )}
                                        </p> */}
                                        <p className="text-muted-foreground text-sm">
                                            {/* Criado em {certificate.date} */}
                                            Criado em 12/10/2023
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Badge
                                        variant={
                                            certificate.status === 'Concluído'
                                                ? 'green'
                                                : certificate.status ===
                                                    'Rascunho'
                                                  ? 'orange'
                                                  : 'green' // Aqui é purple para Agendado
                                        }
                                        size="md"
                                    >
                                        {/* {certificate.status} */}
                                        Emitido
                                    </Badge>

                                    <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-150" />
                                </div>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
        </>
    )
}
