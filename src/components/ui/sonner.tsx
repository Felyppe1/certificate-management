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
                success: (
                    <CircleCheckIcon className="size-4 sm:size-5 text-green-600 dark:text-green-400" />
                ),
                info: (
                    <InfoIcon className="size-4 sm:size-5 text-blue-600 dark:text-blue-400" />
                ),
                warning: (
                    <TriangleAlertIcon className="size-4 sm:size-5 text-orange-600 dark:text-orange-400" />
                ),
                error: (
                    <OctagonXIcon className="size-4 sm:size-5 text-red-600 dark:text-red-400" />
                ),
                loading: (
                    <Loader2Icon className="size-4 sm:size-5 animate-spin text-muted-foreground" />
                ),
            }}
            toastOptions={{
                classNames: {
                    icon: '!mr-1 sm:!mr-3',
                    toast: '!bg-card !border-border !text-card-foreground !rounded-lg !shadow-lg',
                    title: '!text-foreground !text-sm sm:!text-base !font-medium',
                    description: '!text-muted-foreground !text-xs sm:!text-sm',
                    success:
                        '!bg-green-50 dark:!bg-green-950 !border-green-200 dark:!border-green-900 [&_[data-title]]:!text-green-900 dark:[&_[data-title]]:!text-green-100 [&_[data-description]]:!text-green-700 dark:[&_[data-description]]:!text-green-300',
                    error: '!bg-red-50 dark:!bg-red-950 !border-red-200 dark:!border-red-900 [&_[data-title]]:!text-red-900 dark:[&_[data-title]]:!text-red-100 [&_[data-description]]:!text-red-700 dark:[&_[data-description]]:!text-red-300',
                    info: '!bg-blue-50 dark:!bg-blue-950 !border-blue-200 dark:!border-blue-900 [&_[data-title]]:!text-blue-900 dark:[&_[data-title]]:!text-blue-100 [&_[data-description]]:!text-blue-700 dark:[&_[data-description]]:!text-blue-300',
                    warning:
                        '!bg-orange-50 dark:!bg-orange-950 !border-orange-200 dark:!border-orange-900 [&_[data-title]]:!text-orange-900 dark:[&_[data-title]]:!text-orange-100 [&_[data-description]]:!text-orange-700 dark:[&_[data-description]]:!text-orange-300',
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
