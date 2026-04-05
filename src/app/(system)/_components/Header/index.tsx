'use client'

// import { ThemeToggle } from './ThemeToggle'
import { UserDropdown } from './UserDropdown'
import Link from 'next/link'
import { Zap } from 'lucide-react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { useMe } from '@/custom-hooks/use-me'

export function Header() {
    const { data: meResponse } = useMe()

    if (!meResponse) return null

    const { email: userName, id: userId, credits } = meResponse.user
    return (
        <header className="fixed top-0 w-full z-51 bg-card/80 backdrop-blur-md border-b border-input/30 shadow-lg shadow-black/20 border-b-input">
            <nav className="max-w-7xl mx-auto px-[6vw] xs:px-10 py-4 flex items-center justify-between gap-8">
                <Link
                    href="/"
                    className="flex items-center gap-1 sm:gap-2 p-1 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-md"
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
                    <Popover>
                        <PopoverTrigger className="flex items-center gap-1.5 text-xs sm:text-sm px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 cursor-pointer hover:bg-amber-500/20">
                            <Zap className="size-3 sm:size-3.5" />
                            <span className="font-medium">{credits}</span>
                            <span className="text-amber-400/70">créditos</span>
                        </PopoverTrigger>
                        <PopoverContent
                            align="end"
                            className="z-52 bg-blue-800 text-zinc-100 border-none w-[13rem] sm:w-72 shadow-xl"
                        >
                            <p className="font-semibold text-base sm:text-lg mb-2">
                                O que são créditos?
                            </p>
                            <p className="text-zinc-200 text-xs sm:text-sm text-white/90 leading-relaxed">
                                Créditos são consumidos na geração de
                                certificados. <strong>1 crédito</strong> é
                                descontado por linha da fonte de dados. Os
                                créditos são renovados{' '}
                                <strong>todos os dias</strong>.
                            </p>
                        </PopoverContent>
                    </Popover>
                    <UserDropdown name={userName} userId={userId} />

                    {/* <button className="md:hidden text-slate-300">
                        <Menu className="w-6 h-6" />
                    </button> */}
                </div>
            </nav>
        </header>
    )
}
