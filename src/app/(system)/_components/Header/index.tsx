// import { ThemeToggle } from './ThemeToggle'
import { UserDropdown } from './UserDropdown'
import Link from 'next/link'
import { Zap } from 'lucide-react'

interface HeaderProps {
    userName: string
    userId: string
    credits: number
}

export function Header({ userName, userId, credits }: HeaderProps) {
    return (
        <header className="fixed top-0 w-full z-51 bg-card/80 backdrop-blur-md border-b border-input/30 shadow-lg shadow-black/20 border-b-input">
            <nav className="max-w-7xl mx-auto px-[6vw] xs:px-10 py-4 flex items-center justify-between gap-8">
                <Link
                    href="/"
                    className="flex items-center gap-2 p-1 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-md"
                >
                    <img
                        src="/logo.png"
                        alt="Certifica"
                        className="w-8 sm:w-10"
                    />
                    <span className="text-xl sm:text-2xl font-medium text-white">
                        Certifica
                    </span>
                </Link>

                {/* <div className="hidden md:flex items-center gap-8">
                    <Link
                        href="#"
                        className="text-foreground/70 hover:text-foreground transition-colors px-2 py-1 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-md"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="#"
                        className="text-foreground/70 hover:text-foreground transition-colors px-2 py-1 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-md"
                    >
                        Templates
                    </Link>
                </div> */}

                <div className="flex items-center gap-x-4 flex-wrap justify-end">
                    {/* <ThemeToggle /> */}
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Zap className="size-3 sm:size-3.5" />
                        <span className="font-medium">{credits}</span>
                        <span className="text-amber-400/70">créditos</span>
                    </div>
                    <UserDropdown name={userName} userId={userId} />

                    {/* <button className="md:hidden text-slate-300">
                        <Menu className="w-6 h-6" />
                    </button> */}
                </div>
            </nav>
        </header>
    )
}
