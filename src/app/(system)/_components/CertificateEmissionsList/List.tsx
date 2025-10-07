import { fetchCertificateEmissions } from '@/api-calls/fetch-certificate-emissions'
import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

const statusMapping = {
    DRAFT: 'Rascunho',
    EMITTED: 'Emitido',
    SCHEDULED: 'Agendado',
}

export async function List() {
    const data = await fetchCertificateEmissions()

    if (data.certificateEmissions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-6">
                {/* <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="40"
                        height="40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-muted-foreground"
                    >
                        <rect width="18" height="18" x="3" y="3" rx="2" />
                        <path d="M7 7h.01" />
                        <path d="M17 7h.01" />
                        <path d="M7 17h.01" />
                        <path d="M17 17h.01" />
                    </svg>
                </div> */}
                <h3 className="text-xl font-semibold text-foreground mb-2">
                    Nenhuma emissão de certificado criada
                </h3>
                <p className="text-muted-foreground text-center max-w-md">
                    Comece criando sua primeira emissão de certificado clicando
                    no botão acima
                </p>
            </div>
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
                                        <h3 className="text-foreground font-medium text-lg mb-1">
                                            {certificate.name}
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
                                            Criado em {certificate.createdAt}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <Badge
                                        variant={
                                            certificate.status === 'EMITTED'
                                                ? 'green'
                                                : certificate.status === 'DRAFT'
                                                  ? 'orange'
                                                  : 'purple'
                                        }
                                        size="md"
                                    >
                                        {
                                            statusMapping[
                                                certificate.status as keyof typeof statusMapping
                                            ]
                                        }
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
