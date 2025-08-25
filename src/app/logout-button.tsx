'use client'

import { Button } from '@/components/ui/button'
import { logoutAction } from '@/server-actions/logout-action'

export function LogoutButton() {
    return <Button onClick={logoutAction}>Sair</Button>
}
