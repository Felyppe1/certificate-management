import { Award, Mail, TrendingUp, Search, ChevronRight } from 'lucide-react'
import { Header } from './Header'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from '@/components/ui/input-group'
import { CreationForm } from '../CertificateEmissionsList/CreationForm'

export default function Home() {
    console.log('Rendering Home Page')
    return (
        <>
            <Header />

            <main className="pt-30 px-10 pb-20 relative z-10">
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

                    <Card className="gap-0">
                        <div className="pb-8 border-b">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-3xl font-bold text-foreground mb-2">
                                        Minhas Emissões de Certificados
                                    </h2>
                                    <p className="">
                                        Todos os certificados criados por você
                                    </p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <InputGroup>
                                        <InputGroupAddon>
                                            <Search className="size-5 text-muted-foreground" />
                                        </InputGroupAddon>
                                        <InputGroupInput placeholder="Pesquisar emissão" />
                                    </InputGroup>

                                    <CreationForm />
                                </div>
                            </div>
                        </div>

                        <div className="divide-y divide-border">
                            {[
                                {
                                    title: 'Certificado Workshop React',
                                    participants: 45,
                                    date: '2024-01-15',
                                    status: 'Concluído',
                                    color: 'blue',
                                },
                                {
                                    title: 'Certificado Curso Python',
                                    participants: undefined,
                                    date: '2024-01-14',
                                    status: 'Rascunho',
                                    color: 'orange',
                                },
                                {
                                    title: 'Certificado Palestra IA',
                                    participants: 128,
                                    date: '2024-01-13',
                                    status: 'Agendado',
                                    color: 'purple',
                                },
                                {
                                    title: 'Certificado DevOps Básico',
                                    participants: 67,
                                    date: '2024-01-10',
                                    status: 'Concluído',
                                    color: 'blue',
                                },
                            ].map((cert, index) => (
                                <div
                                    key={index}
                                    className="group px-6 py-5 hover:bg-muted transition-all duration-150 cursor-pointer"
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
                                                    {cert.title}
                                                </h3>
                                                {/* <p className="text-muted-foreground text-sm">
                                                    {cert.participants ? (
                                                        <>
                                                            {cert.participants}{' '}
                                                            participantes
                                                        </>
                                                    ) : (
                                                        <>Não há base de dados</>
                                                    )}
                                                </p> */}
                                                <p className="text-muted-foreground text-sm">
                                                    Criado em {cert.date}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <Badge
                                                variant={
                                                    cert.status === 'Concluído'
                                                        ? 'green'
                                                        : cert.status ===
                                                            'Rascunho'
                                                          ? 'orange'
                                                          : 'purple'
                                                }
                                                size="md"
                                            >
                                                {cert.status}
                                            </Badge>

                                            <ChevronRight className="w-6 h-6 text-muted-foreground group-hover:text-foreground group-hover:translate-x-1 transition-all duration-150" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
            </main>

            <div className="fixed top-40 right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none z-0 animate-float"></div>
            <div className="fixed bottom-40 left-20 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none z-0 animate-float-delayed"></div>
        </>
    )
}
