import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertMessageVariants = cva('rounded-lg p-3 sm:p-4 border', {
    variants: {
        variant: {
            success:
                'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900',
            error: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900',
            warning:
                'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900',
            info: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900',
            purple: 'bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900',
            muted: 'bg-muted/50 border',
        },
    },
    defaultVariants: {
        variant: 'muted',
    },
})

const alertMessageIconVariants = cva(
    `[&_svg:not([class*='size-'])]:size-4 sm:[&_svg:not([class*='size-'])]:size-5 flex-shrink-0`,
    {
        variants: {
            variant: {
                success: 'text-green-600 dark:text-green-400',
                error: 'text-red-600 dark:text-red-400',
                warning: 'text-orange-600 dark:text-orange-400',
                info: 'text-blue-600 dark:text-blue-400',
                purple: 'text-purple-600 dark:text-purple-400',
                muted: 'text-muted-foreground',
            },
        },
        defaultVariants: {
            variant: 'muted',
        },
    },
)

const alertMessageTitleVariants = cva('font-medium', {
    variants: {
        variant: {
            success: 'text-green-900 dark:text-green-100',
            error: 'text-red-900 dark:text-red-100',
            warning: 'text-orange-900 dark:text-orange-100',
            info: 'text-blue-900 dark:text-blue-100',
            purple: 'text-purple-900 dark:text-purple-100',
            muted: 'text-foreground',
        },
    },
    defaultVariants: {
        variant: 'muted',
    },
})

const alertMessageDescriptionVariants = cva('', {
    variants: {
        variant: {
            success: 'text-green-700 dark:text-green-300',
            error: 'text-red-700 dark:text-red-300',
            warning: 'text-orange-700 dark:text-orange-300',
            info: 'text-blue-900 dark:text-blue-300',
            purple: 'text-purple-700 dark:text-purple-300',
            muted: 'text-muted-foreground',
        },
    },
    defaultVariants: {
        variant: 'muted',
    },
})

export interface AlertMessageProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof alertMessageVariants> {
    icon: React.ReactNode
    text: React.ReactNode
    description?: React.ReactNode
}

function AlertMessage({
    className,
    variant,
    icon,
    text,
    description,
    ...props
}: AlertMessageProps) {
    return (
        <div
            className={cn(alertMessageVariants({ variant }), className)}
            {...props}
        >
            <div className="flex gap-3">
                <div className={cn(alertMessageIconVariants({ variant }))}>
                    {icon}
                </div>
                <div className="text-xs sm:text-sm">
                    <p className={cn(alertMessageTitleVariants({ variant }))}>
                        {text}
                    </p>
                    {description && (
                        <p
                            className={cn(
                                alertMessageDescriptionVariants({ variant }),
                            )}
                        >
                            {description}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export { AlertMessage, alertMessageVariants }
