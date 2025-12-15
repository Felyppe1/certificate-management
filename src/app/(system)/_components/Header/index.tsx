import { Menu } from 'lucide-react'
// import { ThemeToggle } from './ThemeToggle'
import { UserDropdown } from './UserDropdown'
import Link from 'next/link'

interface HeaderProps {
    userName: string
    userId: string
}

export function Header({ userName, userId }: HeaderProps) {
    return (
        <header className="fixed top-0 w-full z-51 bg-card/80 backdrop-blur-md border-b border-input/30 shadow-lg shadow-black/20 border-b-input">
            <nav className="max-w-7xl mx-auto px-[6vw] xs:px-10 py-4 flex items-center justify-between">
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

                <div className="flex items-center gap-4">
                    {/* <ThemeToggle /> */}
                    <UserDropdown name={userName} userId={userId} />

                    {/* <button className="md:hidden text-slate-300">
                        <Menu className="w-6 h-6" />
                    </button> */}
                </div>
            </nav>
        </header>
    )
}
