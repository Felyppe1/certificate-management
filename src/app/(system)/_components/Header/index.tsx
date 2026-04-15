'use client'

// import { ThemeToggle } from './ThemeToggle'
import { UserDropdown } from './UserDropdown'
import Link from 'next/link'
import { Zap, Menu, X, Settings, LogOut } from 'lucide-react'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { useMe } from '@/custom-hooks/use-me'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { logoutAction } from '@/backend/infrastructure/server-actions/logout-action'
import { toast } from 'sonner'

function CreditsPopover({ credits }: { credits: number }) {
    return (
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
                    Créditos são consumidos na geração de certificados.{' '}
                    <strong>1 crédito</strong> é descontado por linha da fonte
                    de dados. Os créditos são renovados{' '}
                    <strong>todos os dias</strong>.
                </p>
            </PopoverContent>
        </Popover>
    )
}

export function Header() {
    const { data: meResponse } = useMe()
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const pathname = usePathname()
    const router = useRouter()

    useEffect(() => {
        setIsMenuOpen(false)
    }, [pathname])

    const logoutMutation = useMutation({
        mutationFn: async () => {
            window.gtag?.('set', 'user_id', null)
            return await logoutAction()
        },
        onSuccess: () => {
            toast.success('Você saiu com sucesso')
            router.push('/entrar')
        },
    })

    if (!meResponse) return null

    const { email: userName, id: userId, credits } = meResponse.user

    return (
        <header className="fixed top-0 w-full z-51 bg-card/80 backdrop-blur-md border-b border-input/30 shadow-lg shadow-black/20 border-b-input">
            <nav className="max-w-7xl mx-auto px-[6vw] xs:px-10 py-4 flex items-center justify-between gap-8">
                <Link
                    href="/"
                    className="flex items-center sm:gap-2 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] rounded-md"
                >
                    <img
                        src="/logo.png"
                        alt="Certifica"
                        className="w-30 sm:w-40 shrink-0"
                    />
                </Link>

                {/* Desktop: right side (hidden below xs) */}
                <div className="hidden xs:flex items-center gap-x-4 flex-wrap justify-end">
                    {/* <ThemeToggle /> */}
                    <CreditsPopover credits={credits} />
                    <UserDropdown name={userName} userId={userId} />
                </div>

                {/* Mobile: hamburger button (hidden above xs) */}
                <button
                    className="flex xs:hidden items-center justify-center p-2 rounded-md text-foreground hover:bg-accent transition-colors"
                    onClick={() => setIsMenuOpen(prev => !prev)}
                    aria-label="Menu"
                >
                    {isMenuOpen ? (
                        <X className="size-5" />
                    ) : (
                        <Menu className="size-5" />
                    )}
                </button>
            </nav>

            {/* Mobile menu panel */}
            <div
                className={`xs:hidden overflow-hidden transition-all duration-300 ease-in-out ${
                    isMenuOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'
                }`}
            >
                <div className="px-[6vw] pb-4 pt-2 flex flex-col gap-3 border-t border-input/20">
                    <div className="flex items-center justify-between flex-wrap-reverse gap-2">
                        <span className="text-sm truncate pr-3">
                            {userName}
                        </span>
                        <CreditsPopover credits={credits} />
                    </div>
                    <div className="h-px bg-input/20" />
                    <Link
                        href={`/usuarios/${userId}/configuracoes`}
                        className="flex items-center gap-2 text-sm text-foreground hover:text-foreground/70 transition-colors py-1 text-popover-foreground"
                    >
                        <Settings className="size-4 " />
                        Configurações
                    </Link>
                    <button
                        onClick={() => logoutMutation.mutate()}
                        disabled={logoutMutation.isPending}
                        className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors py-1 disabled:opacity-50 cursor-pointer"
                    >
                        <LogOut className="size-4" />
                        {logoutMutation.isPending ? 'Saindo...' : 'Sair'}
                    </button>
                </div>
            </div>
        </header>
    )
}
