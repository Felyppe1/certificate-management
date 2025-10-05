import {
    Award,
    Mail,
    TrendingUp,
    Search,
    ChevronRight,
    Menu,
} from 'lucide-react'

export default function Home() {
    console.log('Rendering Home Pageeee')
    return (
        <div className="min-h-screen bg-[#040715]">
            {/* Header/Navbar */}
            <header className="fixed top-0 w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/50 shadow-lg shadow-black/20">
                <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-600/30">
                            <Award className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-white">
                            CertiFlow
                        </span>
                    </div>

                    <div className="hidden md:flex items-center gap-8">
                        <a
                            href="#"
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            Dashboard
                        </a>
                        <a
                            href="#"
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            Certificados
                        </a>
                        <a
                            href="#"
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            Templates
                        </a>
                        <a
                            href="#"
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            Dados
                        </a>
                        <a
                            href="#"
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            E-mails
                        </a>
                        <a
                            href="#"
                            className="text-slate-400 hover:text-white transition-colors"
                        >
                            Configurações
                        </a>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-3">
                            <span className="text-slate-400 text-sm">
                                João Silva
                            </span>
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                    JS
                                </span>
                            </div>
                        </div>
                        <button className="md:hidden text-slate-300">
                            <Menu className="w-6 h-6" />
                        </button>
                    </div>
                </nav>
            </header>

            {/* Main Content */}
            <main className="pt-24 px-6 pb-20 relative z-10">
                <div className="max-w-7xl mx-auto">
                    {/* Hero Section */}
                    <div className="mb-12">
                        <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white">
                            Dashboard
                        </h1>
                        <p className="text-slate-400 text-lg">
                            Gerencie seus certificados e acompanhe estatísticas
                        </p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                        {/* Card 1 - Certificados Gerados */}
                        <div className="group relative bg-slate-900 rounded-2xl p-8 border border-slate-800 hover:border-blue-600/50 transition-all duration-200 overflow-hidden shadow-xl shadow-black/40 hover:shadow-2xl hover:shadow-blue-600/20 hover:-translate-y-1">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl"></div>

                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="text-slate-500 text-sm mb-2">
                                            Certificados Gerados
                                        </p>
                                        <h2 className="text-5xl font-bold text-white">
                                            2,847
                                        </h2>
                                    </div>
                                    <div className="w-14 h-14 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/40">
                                        <Award className="w-7 h-7 text-white" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                                    <span className="text-emerald-500 text-sm font-medium">
                                        +12%
                                    </span>
                                    <span className="text-slate-600 text-sm">
                                        em relação ao mês anterior
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Card 2 - E-mails Enviados */}
                        <div className="group relative bg-slate-900 rounded-2xl p-8 border border-slate-800 hover:border-purple-600/50 transition-all duration-200 overflow-hidden shadow-xl shadow-black/40 hover:shadow-2xl hover:shadow-purple-600/20 hover:-translate-y-1">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-600/10 rounded-full blur-3xl"></div>

                            <div className="relative z-10">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <p className="text-slate-500 text-sm mb-2">
                                            E-mails Enviados
                                        </p>
                                        <h2 className="text-5xl font-bold text-white">
                                            5,692
                                        </h2>
                                    </div>
                                    <div className="w-14 h-14 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-600/40">
                                        <Mail className="w-7 h-7 text-white" />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                                    <span className="text-emerald-500 text-sm font-medium">
                                        +23%
                                    </span>
                                    <span className="text-slate-600 text-sm">
                                        em relação ao mês anterior
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Certificates Section */}
                    <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl shadow-black/40">
                        <div className="p-8 border-b border-slate-800">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-2">
                                        Meus Certificados
                                    </h2>
                                    <p className="text-slate-500">
                                        Todos os certificados criados por você
                                    </p>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                                        <input
                                            type="text"
                                            placeholder="Pesquisar certificados..."
                                            className="pl-10 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all w-full md:w-80 shadow-inner shadow-black/20"
                                        />
                                    </div>

                                    <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 whitespace-nowrap flex items-center gap-2 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 hover:-translate-y-0.5">
                                        <span className="text-xl">+</span>
                                        Novo Certificado
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Certificates List */}
                        <div className="divide-y divide-slate-800">
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
                                    participants: 32,
                                    date: '2024-01-14',
                                    status: 'Em andamento',
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
                                    className="group p-6 hover:bg-slate-800/50 transition-all duration-150 cursor-pointer"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4 flex-1">
                                            <div
                                                className={`w-12 h-12 ${
                                                    cert.color === 'blue'
                                                        ? 'bg-blue-600 shadow-lg shadow-blue-600/40'
                                                        : cert.color ===
                                                            'orange'
                                                          ? 'bg-orange-600 shadow-lg shadow-orange-600/40'
                                                          : 'bg-purple-600 shadow-lg shadow-purple-600/40'
                                                } rounded-lg flex items-center justify-center`}
                                            >
                                                <Award className="w-6 h-6 text-white" />
                                            </div>

                                            <div className="flex-1">
                                                <h3 className="text-white font-semibold text-lg">
                                                    {cert.title}
                                                </h3>
                                                <p className="text-slate-500 text-sm">
                                                    {cert.participants}{' '}
                                                    participantes • Criado em{' '}
                                                    {cert.date}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <span
                                                className={`px-4 py-2 rounded-full text-sm font-medium shadow-md ${
                                                    cert.status === 'Concluído'
                                                        ? 'bg-blue-600/20 text-blue-400 shadow-blue-600/20'
                                                        : cert.status ===
                                                            'Em andamento'
                                                          ? 'bg-orange-600/20 text-orange-400 shadow-orange-600/20'
                                                          : 'bg-purple-600/20 text-purple-400 shadow-purple-600/20'
                                                }`}
                                            >
                                                {cert.status}
                                            </span>

                                            <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-1 transition-all duration-150" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* Decorative Elements */}
            <div className="fixed top-40 right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none z-0 animate-float"></div>
            <div className="fixed bottom-40 left-20 w-80 h-80 bg-purple-600/20 rounded-full blur-3xl pointer-events-none z-0 animate-float-delayed"></div>
        </div>
    )
}
