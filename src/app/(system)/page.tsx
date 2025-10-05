import { Award, Mail, TrendingUp, Search, ChevronRight } from 'lucide-react'
import { Header } from './_components/Header'
import { Card } from '@/components/ui/card'
import { CertificateEmissionsList } from './_components/CertificateEmissionsList'

export default function Home() {
    return (
        <>
            <div className="max-w-7xl mx-auto">
                <div className="mb-12">
                    <h1 className="text-5xl md:text-5xl font-bold mb-4 text-foreground">
                        Dashboard
                    </h1>
                    <p className="text-foreground text-lg">
                        Gerencie seus certificados e acompanhe estatísticas
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <Card className="">
                        <div className="relative">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <p className="mb-2 text-lg">
                                        Certificados Gerados
                                    </p>
                                    <h2 className="text-5xl font-bold text-foreground">
                                        2,847
                                    </h2>
                                </div>
                                <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/40">
                                    <Award className="w-7 h-7 text-white" />
                                </div>
                            </div>

                            <div className="flex items-center">
                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                                <span className="text-emerald-500 font-medium ml-1">
                                    +12%
                                </span>
                                <span className="ml-2">
                                    em relação ao mês anterior
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Card 2 - E-mails Enviados */}
                    <Card className="">
                        <div className="">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <p className="mb-2 text-lg">
                                        E-mails Enviados
                                    </p>
                                    <h2 className="text-5xl font-bold text-foreground">
                                        5,692
                                    </h2>
                                </div>
                                <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/40">
                                    <Mail className="w-7 h-7 text-white" />
                                </div>
                            </div>

                            <div className="flex items-center">
                                <TrendingUp className="w-4 h-4 text-emerald-500" />
                                <span className="text-emerald-500 font-medium ml-1">
                                    +23%
                                </span>
                                <span className="ml-2">
                                    em relação ao mês anterior
                                </span>
                            </div>
                        </div>
                    </Card>
                </div>

                <CertificateEmissionsList />
            </div>
        </>
    )
}
