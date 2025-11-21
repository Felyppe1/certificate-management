'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, KeyRound, Mail, Trash2, Plus } from 'lucide-react'
import Link from 'next/link'
import { GoogleButton } from '@/components/GoogleButton'

export default function UserConfigurationsPage() {
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
                <p className="text-foreground/90 text-lg font-light">
                    Gerencie sua senha e contas conectadas
                </p>
            </div>

            <div className="max-w-3xl space-y-6">
                {/* Change Password Card */}
                <Card>
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
                </Card>

                {/* Add Password Card (for Google-only users) */}
                <Card>
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
                </Card>

                {/* Google Accounts Card */}
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
                                Gerencie as contas do Google conectadas à sua
                                conta
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
                                    variant="destructive"
                                    size="sm"
                                    className="gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Remover
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
                                    variant="destructive"
                                    size="sm"
                                    className="gap-2"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Remover
                                </Button>
                            </div>
                        </div>

                        {/* Add Google Account Button */}
                        <div className="pt-2">
                            <GoogleButton text="Adicionar Conta do Google" />
                        </div>
                    </div>
                </Card>

                {/* Danger Zone Card */}
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
                            <h3 className="font-semibold mb-2">
                                Excluir Conta
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                Uma vez excluída, não há como voltar atrás. Por
                                favor, tenha certeza.
                            </p>
                            <Button variant="destructive" size="sm">
                                Excluir Minha Conta
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
        </>
    )
}
