'use client'

import { Button } from '@/components/ui/button'
import { logoutAction } from '@/server-actions/logout-action'

export function LogoutButton() {
    const handleLogout = async () => {
        window.gtag('set', 'user_id', null)

        await logoutAction()
    }

    return <Button onClick={handleLogout}>Sair</Button>
}
