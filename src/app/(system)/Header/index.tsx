import { Award, Menu } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

export function Header() {
    return (
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

                <ThemeToggle />

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
    )
}
