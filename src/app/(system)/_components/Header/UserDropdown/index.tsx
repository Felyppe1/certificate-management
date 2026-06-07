'use client'

import { Settings, LogOut, ChevronDown } from 'lucide-react'
import { logoutAction } from '@/backend/infrastructure/server-actions/logout-action'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { useMutation } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface UserDropdownProps {
    name: string
    userId: string
}

export function UserDropdown({ name, userId }: UserDropdownProps) {
    const router = useRouter()

    const mutation = useMutation({
        mutationFn: async () => {
            window.gtag?.('set', 'user_id', null)
            return await logoutAction()
        },
        onSuccess: () => {
            toast.success('Você saiu com sucesso')
            router.push('/entrar')
        },
    })

    const isPending = mutation.isPending

    const handleLogout = () => {
        mutation.mutate()
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="flex items-center gap-2"
                    disabled={isPending}
                    data-testid="user-dropdown-trigger"
                >
                    <span className="text-card-foreground truncate inline-block max-w-56 sm:max-w-80">
                        {name}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <Link href={`/usuarios/${userId}/configuracoes`}>
                    <DropdownMenuItem>
                        <Settings className="w-4 h-4 mr-2 text-popover-foreground" />
                        Configurações
                    </DropdownMenuItem>
                </Link>
                <DropdownMenuItem
                    variant="destructive"
                    onClick={handleLogout}
                    disabled={isPending}
                    data-testid="logout-button"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    {isPending ? 'Saindo...' : 'Sair'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
