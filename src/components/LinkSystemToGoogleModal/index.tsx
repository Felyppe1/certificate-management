'use client'

import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { linkSystemToGoogleAction } from '@/backend/infrastructure/server-actions/link-system-to-google-action'
import { toast } from 'sonner'

interface Props {
    email: string
    onDismiss: () => void
}

export function LinkSystemToGoogleModal({ email, onDismiss }: Props) {
    const router = useRouter()

    const linkMutation = useMutation({
        mutationFn: () => linkSystemToGoogleAction(),
        onSuccess: result => {
            if (result.success) {
                router.push('/')
            } else {
                toast.error(
                    'Ocorreu um erro ao vincular as contas. Tente novamente.',
                )
            }
        },
    })

    return (
        <Dialog open>
            <DialogContent showCloseButton={false}>
                <DialogHeader>
                    <DialogTitle>Conta Google encontrada</DialogTitle>
                </DialogHeader>
                <div className="text-muted-foreground">
                    <p>
                        Encontramos uma conta Google com o e-mail{' '}
                        <strong className="text-foreground/85">{email}</strong>.
                        Deseja vincular seu login do sistema a essa conta?
                    </p>
                    <p className="mt-2">
                        Se não vincular, a conta do sistema será criada
                        separadamente.
                    </p>
                </div>
                <DialogFooter className="justify-end flex-col-reverse gap-2 xs:flex-row">
                    <Button
                        variant="outline"
                        onClick={onDismiss}
                        disabled={linkMutation.isPending}
                    >
                        Não vincular
                    </Button>
                    <Button
                        onClick={() => linkMutation.mutate()}
                        disabled={linkMutation.isPending}
                    >
                        {linkMutation.isPending
                            ? 'Vinculando...'
                            : 'Vincular contas'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
