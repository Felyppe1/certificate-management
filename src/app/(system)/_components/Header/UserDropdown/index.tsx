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
import { useTransition } from 'react'

interface UserDropdownProps {
    name: string
}

export function UserDropdown({ name }: UserDropdownProps) {
    const [isPending, startTransition] = useTransition()

    const handleLogout = () => {
        startTransition(async () => {
            window.gtag?.('set', 'user_id', null)
            await logoutAction()
        })
    }

    const firstAndLastName = name.split(' ').slice(0, 2).join(' ')

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="hidden md:flex items-center gap-2"
                    disabled={isPending}
                >
                    <span className="text-card-foreground">
                        {firstAndLastName}
                    </span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2 text-popover-foreground" />
                    Configurações
                </DropdownMenuItem>
                <DropdownMenuItem
                    variant="destructive"
                    onClick={handleLogout}
                    disabled={isPending}
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    {isPending ? 'Saindo...' : 'Sair'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
