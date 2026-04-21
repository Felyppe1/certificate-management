'use client'

import { Button } from '@/components/ui/button'
import { GoogleIcon } from '../svg/GoogleIcon'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes } from 'react'

interface GoogleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    text: string
    href?: string
    isLoading?: boolean
    size?: 'default' | 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'
}

export function GoogleButton({
    text,
    href,
    isLoading,
    className,
    disabled,
    size = 'default',
    ...props
}: GoogleButtonProps) {
    const buttonClass = cn(
        'w-full dark:bg-gray-100 dark:hover:bg-white/80 dark:text-background border-border',
        className,
    )

    if (href) {
        return (
            <Button
                asChild
                variant="outline"
                className={buttonClass}
                size={size}
                disabled={disabled || isLoading}
            >
                <a
                    href={href}
                    className="flex items-center justify-center gap-3"
                >
                    <GoogleIcon className="size-5" />
                    <span>{text}</span>
                </a>
            </Button>
        )
    }

    return (
        <Button
            variant="outline"
            className={buttonClass}
            size={size}
            disabled={disabled || isLoading}
            {...props}
        >
            <div className="flex items-center justify-center gap-3">
                {isLoading ? (
                    <Loader2 className="size-5 animate-spin text-muted-foreground" />
                ) : (
                    <GoogleIcon className="size-5" />
                )}
                <span>{text}</span>
            </div>
        </Button>
    )
}
