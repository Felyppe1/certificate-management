'use client'

import { CertificateEmissionsResponse } from '@/api-calls/fetch-certificate-emissions'
import { Badge } from '@/components/ui/badge'
import { useCertificatesStore } from '@/lib/certificatesStore'
import { ChevronRight } from 'lucide-react'
import Link from 'next/link'

export const STATUS_MAPPING = {
    DRAFT: 'Rascunho',
    EMITTED: 'Emitido',
    SCHEDULED: 'Agendado',
    GENERATED: 'Gerado',
}

interface ListRendererProps extends CertificateEmissionsResponse {}

export function ListRenderer({ certificateEmissions }: ListRendererProps) {
    const inputValue = useCertificatesStore(state => state.inputValue)

    const filteredEmissions = certificateEmissions.filter((certificate: any) =>
        certificate.name.toLowerCase().includes(inputValue.toLowerCase() || ''),
    )

    if (filteredEmissions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-6">
                <h3 className="text-lg sm:text-xl font-semibold text-foreground text-center mb-2">
                    {inputValue
                        ? 'Nenhuma emissão encontrada'
                        : 'Nenhuma emissão de certificado criada'}
                </h3>
                <p className="text-muted-foreground text-center max-w-md text-sm sm:text-base">
                    {inputValue
                        ? 'Tente buscar por outro nome'
                        : 'Comece criando sua primeira emissão de certificado clicando no botão acima'}
                </p>
            </div>
        )
    }

    return (
        <ul className="divide-y divide-border">
            {filteredEmissions.map((certificate: any) => (
                <li key={certificate.id}>
                    <Link
                        href={`/certificados/${certificate.id}`}
                        className="group block px-2 sm:px-6 py-5 hover:bg-muted transition-all duration-100 cursor-pointer outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-md"
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
                                    <h3 className="text-foreground font-medium text-base sm:text-lg mb-1">
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
                                    <p className="text-muted-foreground text-xs sm:text-sm">
                                        Criada em{' '}
                                        {new Date(
                                            certificate.createdAt,
                                        ).toLocaleDateString('pt-BR', {
                                            timeZone: 'America/Sao_Paulo',
                                            day: '2-digit',
                                            month: '2-digit',
                                            year: 'numeric',
                                        })}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-4">
                                <Badge
                                    variant={
                                        certificate.status === 'DRAFT'
                                            ? 'orange'
                                            : certificate.status === 'GENERATED'
                                              ? 'blue'
                                              : certificate.status ===
                                                  'SCHEDULED'
                                                ? 'purple'
                                                : 'green'
                                    }
                                    size="md"
                                >
                                    {
                                        STATUS_MAPPING[
                                            certificate.status as keyof typeof STATUS_MAPPING
                                        ]
                                    }
                                </Badge>

                                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-150" />
                            </div>
                        </div>
                    </Link>
                </li>
            ))}
        </ul>
    )
}
