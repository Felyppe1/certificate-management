'use client'

import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { confirmLinkGoogleAction } from '@/backend/infrastructure/server-actions/confirm-link-google-action'
import { toast } from 'sonner'
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'

interface Props {
    systemUserEmail: string
}

export function LinkGoogleConfirmCard({ systemUserEmail }: Props) {
    const router = useRouter()

    const confirmMutation = useMutation({
        mutationFn: () => confirmLinkGoogleAction(),
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
        <>
            <Card className="w-full max-w-[calc(100%-2rem)] sm:max-w-xl">
                <CardHeader className="px-0 md:px-0">
                    <CardTitle>Conta existente encontrada</CardTitle>
                    {/* <CardDescription>
                        Encontramos uma conta no sistema com o e-mail{' '}
                        <strong className="text-foreground">{systemUserEmail}</strong>.
                        Deseja vincular sua conta Google a ela?
                    </CardDescription> */}
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        Encontramos uma conta no sistema com o e-mail{' '}
                        <strong className="text-foreground/85">
                            {systemUserEmail}
                        </strong>
                        . Deseja vincular sua conta Google a ela?
                    </p>
                    <p className="text-muted-foreground mt-2">
                        Se não vincular, a conta Google será criada
                        separadamente.
                    </p>
                </CardContent>

                <CardFooter className="px-0 justify-end gap-3 flex-wrap-reverse">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/')}
                        disabled={confirmMutation.isPending}
                    >
                        Não vincular
                    </Button>
                    <Button
                        onClick={() => confirmMutation.mutate()}
                        disabled={confirmMutation.isPending}
                    >
                        {confirmMutation.isPending
                            ? 'Vinculando...'
                            : 'Vincular contas'}
                    </Button>
                </CardFooter>
            </Card>
            {/* <div className="space-y-6">
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        Encontramos uma conta no sistema com o e-mail{' '}
                        <strong className="text-foreground">{systemUserEmail}</strong>.
                        Deseja vincular sua conta Google a ela?
                    </p>
                    <p className="text-sm text-muted-foreground">
                        Se não vincular, uma conta Google separada será criada.
                    </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <Button
                        variant="outline"
                        onClick={() => router.push('/')}
                        disabled={confirmMutation.isPending}
                    >
                        Entrar sem vincular
                    </Button>
                    <Button
                        onClick={() => confirmMutation.mutate()}
                        disabled={confirmMutation.isPending}
                    >
                        {confirmMutation.isPending ? 'Vinculando...' : 'Vincular contas'}
                    </Button>
                </div>
            </div> */}
        </>
    )
}
