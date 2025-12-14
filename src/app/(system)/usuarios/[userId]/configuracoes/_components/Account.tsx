import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Mail, Trash2 } from 'lucide-react'

export function Account() {
    return (
        <Card>
            <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Mail className="w-6 h-6 text-blue-500" />
                </div>
                <div className="flex-1">
                    <h2 className="text-xl font-semibold mb-1">
                        Contas do Google
                    </h2>
                    <p className="text-muted-foreground font-light">
                        Gerencie as contas do Google conectadas à sua conta
                    </p>
                </div>
            </div>

            <div className="space-y-4">
                {/* Connected Google Accounts List */}
                <div className="space-y-3">
                    {/* Example connected account */}
                    <div className="flex items-center justify-between p-4 bg-muted/40 dark:bg-muted/20 rounded-2xl border">
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
                            {/* {isDeleting ? 'Removendo...' : 'Remover'} */}
                        </Button>
                    </div>

                    {/* Example connected account 2 */}
                    <div className="flex items-center justify-between p-4 bg-muted/40 dark:bg-muted/20 rounded-2xl border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold">
                                JD
                            </div>
                            <div>
                                <p className="font-medium">
                                    john.doe@example.com
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
                            {/* {isDeleting ? 'Removendo...' : 'Remover'} */}
                        </Button>
                    </div>
                </div>

                {/* Add Google Account Button */}
                {/* <div className="pt-2">
                    <GoogleButton text="Adicionar Conta do Google" />
                </div> */}
            </div>
        </Card>
    )
}
