'use client'

import { deleteGoogleAccountAction } from '@/backend/infrastructure/server-actions/delete-google-account-action'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, Trash2 } from 'lucide-react'
import { useTransition } from 'react'

interface DeleteAccountProps {
    userEmail: string
}

export function DeleteAccount({}: DeleteAccountProps) {
    const [isPending, startTransition] = useTransition()

    const handleDeleteAccount = () => {
        startTransition(() => {
            deleteGoogleAccountAction()
        })
    }
    // const login = useGoogleLogin({
    //     flow: 'auth-code',
    //     scope: [
    //         'openid',
    //         'email',
    //         'profile',
    //         'https://www.googleapis.com/auth/drive.file',
    //         'https://www.googleapis.com/auth/drive.readonly',
    //     ].join(' '),
    //     hint: userEmail,
    //     onSuccess: async codeResponse => {
    //         console.log(codeResponse)

    //         const formData = new FormData()
    //         formData.append('code', codeResponse.code)

    // startTransition(() => {
    //     deleteGoogleAccountAction()
    // })
    //     },
    // })

    return (
        <Card className="border-destructive/50">
            <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-destructive" />
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-1 text-destructive">
                        Zona de Perigo
                    </h2>
                    <p className="text-muted-foreground font-light">
                        Ações irreversíveis que afetam sua conta
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                <div className="p-4 bg-destructive/5 dark:bg-destructive/10 rounded-2xl border border-destructive/20">
                    <h3 className="font-semibold mb-2">Excluir Conta</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Todos os seus dados serão apagados. Por favor, tenha
                        certeza.
                    </p>
                    <Button
                        variant="destructive"
                        disabled={isPending}
                        onClick={handleDeleteAccount}
                    >
                        {isPending && <Loader2 className="animate-spin" />}
                        Excluir Minha Conta
                    </Button>
                </div>
            </div>
            {/* <div className="flex items-center justify-between p-4 bg-muted/40 dark:bg-muted/20 rounded-2xl border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                        LF
                    </div>
                    <div>
                        <p className="font-medium">
                            luiz.felyppe@gmail.com
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Conectado
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                    <Trash2 className="h-4 w-4" />
                    Remover
                </Button>
            </div> */}
        </Card>
    )
}
