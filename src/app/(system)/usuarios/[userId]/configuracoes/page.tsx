'use server'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { fetchMe } from '@/api-calls/fetch-me'
import { DeleteAccount } from './_components/DeleteAccount'

export default async function UserConfigurationsPage() {
    const data = await fetchMe()

    return (
        <>
            <div className="mb-8">
                <Link href="/">
                    <Button variant="outline" size="sm" className="mb-6">
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </Button>
                </Link>

                <h1 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
                    Configurações da Conta
                </h1>
                {/* <p className="text-foreground/90 text-lg font-light">
                    Gerencie sua senha e contas conectadas
                </p> */}
            </div>

            <div className="max-w-3xl space-y-6">
                {/* Change Password Card */}
                {/* <Card>
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                            <KeyRound className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-semibold mb-1">
                                Alterar Senha
                            </h2>
                            <p className="text-muted-foreground font-light">
                                Atualize sua senha para manter sua conta segura
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="current-password">
                                Senha Atual
                            </Label>
                            <Input
                                id="current-password"
                                type="password"
                                placeholder="Digite sua senha atual"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="new-password">Nova Senha</Label>
                            <Input
                                id="new-password"
                                type="password"
                                placeholder="Digite sua nova senha"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">
                                Confirmar Nova Senha
                            </Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                placeholder="Confirme sua nova senha"
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button>Atualizar Senha</Button>
                        </div>
                    </div>
                </Card> */}

                {/* Add Password Card (for Google-only users) */}
                {/* <Card>
                    <div className="flex items-start gap-4 mb-6">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                            <Plus className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-xl font-semibold mb-1">
                                Adicionar Senha
                            </h2>
                            <p className="text-muted-foreground font-light">
                                Crie uma senha para poder fazer login sem usar o
                                Google
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="add-password">Nova Senha</Label>
                            <Input
                                id="add-password"
                                type="password"
                                placeholder="Digite sua nova senha"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="add-confirm-password">
                                Confirmar Senha
                            </Label>
                            <Input
                                id="add-confirm-password"
                                type="password"
                                placeholder="Confirme sua nova senha"
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button>Criar Senha</Button>
                        </div>
                    </div>
                </Card> */}

                {/* Google Accounts Card */}
                {/* <Account /> */}

                {/* Danger Zone Card */}
                <DeleteAccount userEmail={data.user.email} />
            </div>
        </>
    )
}
