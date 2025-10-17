'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    RefreshCw,
    Edit3,
    Trash2,
    Download,
    Eye,
    FileDown,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react'
import { startTransition, useActionState, useState } from 'react'
import {
    INPUT_METHOD,
    DATA_SOURCE_FILE_EXTENSION,
} from '@/backend/domain/data-source'
import { deleteDataSourceAction } from '@/backend/infrastructure/server-actions/delete-data-source-action'
import { refreshDataSourceAction } from '@/backend/infrastructure/server-actions/refresh-data-source-action'

function getInputMethodLabel(method: string) {
    switch (method) {
        case 'URL':
            return 'Link do Google'
        case 'GOOGLE_DRIVE':
            return 'Google Drive'
        case 'UPLOAD':
            return 'Upload Local'
        default:
            return method
    }
}

interface DataSourceDisplayProps {
    dataSource: {
        id: string
        driveFileId: string | null
        storageFileUrl: string | null
        inputMethod: INPUT_METHOD
        fileName: string
        fileExtension: DATA_SOURCE_FILE_EXTENSION
        columns: string[]
        thumbnailUrl: string | null
    }
    certificateId: string
    onEdit: () => void
    // Mock data - TODO: Replace with real data from API
    data?: Array<Record<string, string>>
    certificatesGenerated?: boolean
    totalSize?: string
}

export function DataSourceDisplay({
    dataSource,
    certificateId,
    onEdit,
    data = [],
    certificatesGenerated = false,
    totalSize = '0 KB',
}: DataSourceDisplayProps) {
    const [, refreshAction, isRefreshing] = useActionState(
        refreshDataSourceAction,
        null,
    )

    const [, deleteAction, isDeleting] = useActionState(
        deleteDataSourceAction,
        null,
    )

    const handleRefresh = () => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)

        startTransition(() => {
            refreshAction(formData)
        })
    }

    const handleRemoveDataSource = () => {
        const formData = new FormData()
        formData.append('certificateId', certificateId)

        startTransition(() => {
            deleteAction(formData)
        })
    }

    const handleViewFile = () => {
        if (dataSource.inputMethod === 'UPLOAD' && dataSource.storageFileUrl) {
            window.open(dataSource.storageFileUrl, '_blank')
        } else if (dataSource.driveFileId) {
            const driveUrl = `https://drive.google.com/file/d/${dataSource.driveFileId}/view`
            window.open(driveUrl, '_blank')
        }
    }

    return (
        <div className="space-y-4">
            <Card className="">
                <CardHeader className="flex justify-between">
                    <div>
                        <CardTitle>Fonte de Dados</CardTitle>
                        <CardDescription>
                            Fonte de dados utilizada para gerar os certificados
                        </CardDescription>
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                        {dataSource.inputMethod !== 'UPLOAD' && (
                            <Button
                                variant="outline"
                                onClick={handleRefresh}
                                disabled={isRefreshing || isDeleting}
                            >
                                <RefreshCw
                                    className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`}
                                />
                                {isRefreshing ? 'Atualizando...' : 'Atualizar'}
                            </Button>
                        )}

                        <Button
                            variant="outline"
                            onClick={onEdit}
                            disabled={isRefreshing || isDeleting}
                        >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Editar
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleRemoveDataSource}
                            disabled={isDeleting || isRefreshing}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {isDeleting ? 'Removendo...' : 'Remover'}
                        </Button>
                    </div>
                </CardHeader>

                <CardContent className="flex flex-row gap-10">
                    {/* {dataSource.thumbnailUrl ? (
                        <img
                            src={dataSource.thumbnailUrl || ''}
                            alt=""
                            className="aspect-3/2 w-full max-w-[25rem] object-cover object-top"
                        />
                    ) : (
                        <div className="aspect-3/2 w-full max-w-[25rem] rounded-md bg-muted flex justify-center items-center text-muted-foreground">
                            Gerando miniatura...
                        </div>
                    )} */}

                    <div className="flex flex-col w-full">
                        <div className="flex flex-col gap-4 mt-1">
                            {/* File Info */}
                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    <svg
                                        className="w-5 h-5 text-muted-foreground"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                                        <polyline points="13 2 13 9 20 9" />
                                    </svg>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-muted-foreground mb-1">
                                        Nome do arquivo
                                    </p>
                                    <p className="font-medium truncate">
                                        {dataSource.fileName}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    <svg
                                        className="w-5 h-5 text-muted-foreground"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 16v-4M12 8h.01" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="text-muted-foreground mb-1">
                                        Fonte
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <p className="font-medium">
                                            {getInputMethodLabel(
                                                dataSource.inputMethod,
                                            )}
                                        </p>
                                        {dataSource.inputMethod === 'UPLOAD' ? (
                                            <Button
                                                variant="default"
                                                onClick={handleViewFile}
                                                size="sm"
                                            >
                                                <svg
                                                    className="h-4 w-4 mr-2"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                                                </svg>
                                                Baixar
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={handleViewFile}
                                            >
                                                <svg
                                                    className="h-4 w-4 mr-2"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                >
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                                                </svg>
                                                Abrir
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    <svg
                                        className="w-5 h-5 text-muted-foreground"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 16v-4M12 8h.01" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="text-muted-foreground mb-1">
                                        Colunas
                                    </p>
                                    <div className="mt-3">
                                        {dataSource.columns.length === 0 ? (
                                            <p>Nenhuma coluna encontrada</p>
                                        ) : (
                                            dataSource.columns.map(
                                                (column, index) => (
                                                    <Badge
                                                        key={index}
                                                        className="font-mono mr-2 mb-2 bg-muted text-accent-foreground"
                                                    >
                                                        {column}
                                                    </Badge>
                                                ),
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    <svg
                                        className="w-5 h-5 text-muted-foreground"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                    >
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M12 16v-4M12 8h.01" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <p className="text-muted-foreground mb-1">
                                        Conteúdo
                                    </p>
                                    <div className="mt-3">
                                        {dataSource.columns.length === 0 ? (
                                            <p>Nenhuma coluna encontrada</p>
                                        ) : (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-sm text-muted-foreground">
                                                            Linhas:{' '}
                                                            <span className="font-medium text-foreground">
                                                                {data.length}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="border rounded-lg overflow-hidden">
                                                    <div className="overflow-x-auto">
                                                        <Table>
                                                            <TableHeader>
                                                                <TableRow>
                                                                    {certificatesGenerated && (
                                                                        <TableHead className="w-[100px]">
                                                                            Ações
                                                                        </TableHead>
                                                                    )}
                                                                    {dataSource.columns.map(
                                                                        column => (
                                                                            <TableHead
                                                                                key={
                                                                                    column
                                                                                }
                                                                            >
                                                                                {
                                                                                    column
                                                                                }
                                                                            </TableHead>
                                                                        ),
                                                                    )}
                                                                </TableRow>
                                                            </TableHeader>
                                                            <TableBody>
                                                                {data.map(
                                                                    (
                                                                        row,
                                                                        index,
                                                                    ) => (
                                                                        <TableRow
                                                                            key={
                                                                                index
                                                                            }
                                                                        >
                                                                            {certificatesGenerated && (
                                                                                <TableCell>
                                                                                    <div className="flex gap-1">
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            className="h-8 w-8 p-0"
                                                                                            title="Visualizar certificado"
                                                                                        >
                                                                                            <Eye className="h-4 w-4" />
                                                                                        </Button>
                                                                                        <Button
                                                                                            variant="ghost"
                                                                                            size="sm"
                                                                                            className="h-8 w-8 p-0"
                                                                                            title="Baixar certificado"
                                                                                        >
                                                                                            <Download className="h-4 w-4" />
                                                                                        </Button>
                                                                                    </div>
                                                                                </TableCell>
                                                                            )}
                                                                            {dataSource.columns.map(
                                                                                column => (
                                                                                    <TableCell
                                                                                        key={
                                                                                            column
                                                                                        }
                                                                                    >
                                                                                        {row[
                                                                                            column
                                                                                        ] ||
                                                                                            '-'}
                                                                                    </TableCell>
                                                                                ),
                                                                            )}
                                                                        </TableRow>
                                                                    ),
                                                                )}
                                                            </TableBody>
                                                        </Table>
                                                    </div>
                                                </div>

                                                <div className="flex gap-8 items-center">
                                                    {certificatesGenerated && (
                                                        <>
                                                            <Button size="sm">
                                                                <FileDown className="h-4 w-4 mr-2" />
                                                                Baixar Todos
                                                            </Button>

                                                            <p className="text-sm text-muted-foreground">
                                                                Tamanho total:{' '}
                                                                <span className="font-medium text-foreground">
                                                                    {totalSize}
                                                                </span>
                                                            </p>
                                                        </>
                                                    )}

                                                    {/* <p className="text-sm text-muted-foreground">
                                                        Formato:{' '}
                                                        <Badge
                                                            variant='blue'
                                                            // size={'sm'}
                                                        >
                                                            PDF
                                                        </Badge>
                                                    </p> */}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Info box - mais discreto */}
            {/* {dataSource.columns.length > 0 && (
                <div className="bg-muted/50 backdrop-blur-sm border rounded-lg p-4">
                    <div className="flex gap-3">
                        <div className="flex-shrink-0 text-blue-600 dark:text-blue-400">
                            <svg
                                className="w-5 h-5"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                            >
                                <circle cx="12" cy="12" r="10" />
                                <path d="M12 16v-4M12 8h.01" />
                            </svg>
                        </div>
                        <div className="text-sm space-y-1">
                            <p className="font-medium">
                                Como funcionam as colunas
                            </p>
                            <p className="text-muted-foreground">
                                As colunas representam os dados que serão utilizados para preencher os certificados.
                            </p>
                        </div>
                    </div>
                </div>
            )} */}
        </div>
    )
}
