'use client'

import {
    CircleCheckIcon,
    InfoIcon,
    Loader2Icon,
    OctagonXIcon,
    TriangleAlertIcon,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
    const { theme = 'system' } = useTheme()

    return (
        <Sonner
            theme={theme as ToasterProps['theme']}
            className="toaster group"
            icons={{
                success: <CircleCheckIcon className="size-4" />,
                info: <InfoIcon className="size-4" />,
                warning: <TriangleAlertIcon className="size-4" />,
                error: <OctagonXIcon className="size-4" />,
                loading: <Loader2Icon className="size-4 animate-spin" />,
            }}
            toastOptions={{
                classNames: {
                    toast: '!bg-card !border-border !text-card-foreground',
                    title: '!text-card-foreground',
                    description: '!text-muted-foreground',
                    success:
                        '!bg-emerald-950/80 !border-emerald-800/50 !text-emerald-50',
                    error: '!bg-red-950/80 !border-red-800/50 !text-red-50',
                    info: '!bg-blue-950/80 !border-blue-800/50 !text-blue-50',
                    warning:
                        '!bg-amber-950/80 !border-amber-800/50 !text-amber-50',
                },
            }}
            style={
                {
                    '--normal-bg': 'var(--card)',
                    '--normal-text': 'var(--card-foreground)',
                    '--normal-border': 'var(--border)',
                    '--border-radius': 'var(--radius)',
                } as React.CSSProperties
            }
            {...props}
        />
    )
}

export { Toaster }
