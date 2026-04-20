'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Link, Loader2, Plus, Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isRedirectError } from 'next/dist/client/components/redirect-error'
import { unlinkExternalAccountAction } from '@/backend/infrastructure/server-actions/unlink-external-account-action'
import { Provider } from '@/backend/domain/external-account'
import { useMe } from '@/custom-hooks/use-me'
import { useGoogleRelogin } from '@/custom-hooks/useGoogleRelogin'
import { queryKeys } from '@/lib/query-keys'

export function Account() {
    const queryClient = useQueryClient()
    const { data } = useMe()
    const { externalAccounts, email, isEmailVerified } = data.user

    const hasGoogleAccount = externalAccounts.some(a => a.provider === 'GOOGLE')

    const canUnlink = (provider: Provider) => {
        const hasVerifiedSystemLogin = !!email && isEmailVerified
        const hasOtherExternalAccount =
            externalAccounts.filter(a => a.provider !== provider).length > 0
        return hasVerifiedSystemLogin || hasOtherExternalAccount
    }

    const unlinkMutation = useMutation({
        mutationFn: async (provider: Provider) => {
            const fd = new FormData()
            fd.append('provider', provider)
            const result = await unlinkExternalAccountAction(null, fd)
            if (result?.success === false) throw result
            return result
        },
        onSuccess: () => {
            toast.success('Conta desvinculada com sucesso.')
            queryClient.invalidateQueries({ queryKey: queryKeys.me() })
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return
            if (error?.errorType === 'cannot-remove-last-login-method') {
                toast.error(
                    'Você precisa de outro método de login antes de desvincular esta conta.',
                )
            } else {
                toast.error('Erro ao desvincular conta. Tente novamente.')
            }
        },
    })

    const { login: addGoogleLogin, isLoading: isAddingGoogle } =
        useGoogleRelogin({
            onSuccess: () => {
                toast.success('Conta Google vinculada com sucesso!')
                queryClient.invalidateQueries({ queryKey: queryKeys.me() })
            },
        })

    return (
        <Card>
            <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Link className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-1">
                        Contas Vinculadas
                    </h2>
                    <p className="text-muted-foreground font-light">
                        Gerencie as contas externas conectadas à sua conta
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {externalAccounts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma conta externa vinculada.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {externalAccounts.map(account => {
                            const isUnlinking =
                                unlinkMutation.isPending &&
                                unlinkMutation.variables === account.provider
                            const unlinkAllowed = canUnlink(account.provider)

                            return (
                                <div
                                    key={account.provider}
                                    className="flex items-center justify-between p-4 bg-muted/40 dark:bg-muted/20 rounded-2xl border flex-wrap gap-4"
                                >
                                    <div className="flex items-center gap-3 flex-1 min-w-50">
                                        <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                            {account.provider === 'GOOGLE'
                                                ? 'G'
                                                : account.provider[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">
                                                {account.email}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {account.provider === 'GOOGLE'
                                                    ? 'Google'
                                                    : account.provider}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={
                                            !unlinkAllowed ||
                                            unlinkMutation.isPending
                                        }
                                        onClick={() =>
                                            unlinkMutation.mutate(
                                                account.provider,
                                            )
                                        }
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 disabled:opacity-40"
                                        title={
                                            !unlinkAllowed
                                                ? 'Configure outro método de login antes de desvincular'
                                                : undefined
                                        }
                                    >
                                        {isUnlinking ? (
                                            <Loader2 className="size-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="size-4" />
                                        )}
                                        {isUnlinking
                                            ? 'Removendo...'
                                            : 'Remover'}
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                )}

                {!hasGoogleAccount && (
                    <div className="pt-2">
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => addGoogleLogin()}
                            disabled={isAddingGoogle}
                        >
                            {isAddingGoogle ? (
                                <Loader2 className="size-4 animate-spin" />
                            ) : (
                                <Plus className="size-4" />
                            )}
                            Adicionar Conta Google
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    )
}
