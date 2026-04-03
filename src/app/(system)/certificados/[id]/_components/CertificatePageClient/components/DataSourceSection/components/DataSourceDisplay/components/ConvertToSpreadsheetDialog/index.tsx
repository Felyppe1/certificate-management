'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Loader2, FileSpreadsheet } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { turnDataSourceIntoSpreadsheetAction } from '@/backend/infrastructure/server-actions/turn-data-source-into-spreadsheet-action'
import { queryKeys } from '@/lib/query-keys'
import { toast } from 'sonner'
import { isRedirectError } from 'next/dist/client/components/redirect-error'

interface ConvertToSpreadsheetDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    certificateId: string
    login: () => void
}

export function ConvertToSpreadsheetDialog({
    open,
    onOpenChange,
    certificateId,
    login,
}: ConvertToSpreadsheetDialogProps) {
    const [convertFormat, setConvertFormat] = useState<'csv' | 'xlsx'>('xlsx')
    const [convertDestination, setConvertDestination] = useState<
        'local' | 'drive'
    >('local')

    const queryClient = useQueryClient()

    const convertMutation = useMutation({
        mutationFn: async (formData: FormData) => {
            const result = await turnDataSourceIntoSpreadsheetAction(
                null,
                formData,
            )
            if (result?.success === false) {
                throw result
            }
            return result
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: queryKeys.certificateEmission(certificateId),
            })
            toast.success('Planilha gerada com sucesso')
            onOpenChange(false)
        },
        onError: (error: any) => {
            if (isRedirectError(error)) return

            if (error?.errorType === 'google-account-not-found') {
                toast.error(
                    'Conta do Google não encontrada. Faça login com o Google para salvar no Drive.',
                )
            } else if (error?.errorType === 'google-session-expired') {
                toast.error(
                    'Sessão do Google expirada. Entre novamente com a sua conta.',
                )
                login()
            } else if (error?.errorType === 'data-source-not-image') {
                toast.error('A fonte de dados não é composta por imagens.')
            } else {
                toast.error(
                    'Ocorreu um erro ao tentar converter a fonte de dados',
                )
            }
        },
    })

    const handleConvert = () => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)
        formData.append('format', convertFormat)
        formData.append('destination', convertDestination)

        convertMutation.mutate(formData)
    }
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Converter imagens em planilha</DialogTitle>
                    <DialogDescription>
                        As imagens serão removidas do armazenamento e
                        substituídas por uma planilha com os dados extraídos.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-5 py-2">
                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium">Formato</p>
                        <RadioGroup
                            value={convertFormat}
                            onValueChange={v =>
                                setConvertFormat(v as 'csv' | 'xlsx')
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="xlsx" id="fmt-xlsx" />
                                <Label htmlFor="fmt-xlsx">XLSX</Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="csv" id="fmt-csv" />
                                <Label htmlFor="fmt-csv">CSV</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium">Destino</p>
                        <RadioGroup
                            value={convertDestination}
                            onValueChange={v =>
                                setConvertDestination(v as 'local' | 'drive')
                            }
                            className="flex gap-4"
                        >
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="local" id="dest-local" />
                                <Label htmlFor="dest-local">
                                    Baixar na máquina
                                </Label>
                            </div>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="drive" id="dest-drive" />
                                <Label htmlFor="dest-drive">
                                    Salvar no Drive
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={convertMutation.isPending}
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleConvert}
                        disabled={convertMutation.isPending}
                    >
                        {convertMutation.isPending ? (
                            <>
                                <Loader2 className="animate-spin" />
                                Convertendo...
                            </>
                        ) : (
                            <>
                                <FileSpreadsheet />
                                Converter
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
