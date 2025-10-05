import { Menu } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'
import Link from 'next/link'
import { LogoutButton } from '@/app/logout-button'

export function Header() {
    return (
        <header className="fixed top-0 w-full z-50 bg-card/80 backdrop-blur-md border-b border-input/30 shadow-lg shadow-black/20">
            <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                <Link
                    href="/"
                    className="flex items-center gap-2 p-1 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-md"
                >
                    <img src="/logo.png" alt="Certifica" className="w-10" />
                    <span className="text-2xl font-medium text-white">
                        Certifica
                    </span>
                </Link>

                <div className="hidden md:flex items-center gap-8">
                    <Link
                        href="#"
                        className="text-card-foreground hover:text-foreground transition-colors px-2 py-1 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-md"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="#"
                        className="text-card-foreground hover:text-foreground transition-colors px-2 py-1 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-md"
                    >
                        Templates
                    </Link>
                </div>

                <div className="flex items-center gap-10">
                    <ThemeToggle />
                    <button className="hidden md:flex items-center gap-3 px-2 p-1 cursor-pointer">
                        <span className="text-card-foreground">João Silva</span>
                        <div className="w-10 h-10 bg-yellow-800 rounded-full flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                                JS
                            </span>
                        </div>
                    </button>
                    <LogoutButton />
                    <button className="md:hidden text-slate-300">
                        <Menu className="w-6 h-6" />
                    </button>
                </div>
            </nav>
        </header>
    )
}
