import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
    'h-fit inline-flex items-center justify-center border font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:pointer-events-none gap-1 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden',
    {
        variants: {
            variant: {
                default:
                    'border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
                secondary:
                    'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90',
                destructive:
                    'border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
                outline:
                    'text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
                blue: 'border-transparent bg-blue-600/20 text-blue-400 [a&]:hover:bg-blue-600/30',
                orange: 'border-transparent bg-orange-600/20 text-orange-400 [a&]:hover:bg-orange-600/30',
                purple: 'border-transparent bg-purple-600/20 text-purple-400 [a&]:hover:bg-purple-600/30',
                green: 'border-transparent bg-green-600/20 text-green-400 [a&]:hover:bg-green-600/30',
            },
            size: {
                default: `sm:px-2 sm:py-1 sm:text-sm sm:rounded-md sm:[&>svg]:size-3.5
                        px-2 py-1 text-xs rounded-sm [&>svg]:size-3
                `,
                sm: 'px-2 py-1 text-xs rounded-lg [&>svg]:size-3',
                md: `sm:px-3 sm:py-1.5 sm:text-base sm:gap-2 sm:rounded-lg sm:[&>svg]:size-4
                    px-2 py-1 text-sm rounded-md [&>svg]:size-3.5
                `,
                lg: 'px-4 py-2 text-base rounded-xl [&>svg]:size-5',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    },
)

function Badge({
    className,
    variant,
    size,
    asChild = false,
    ...props
}: React.ComponentProps<'span'> &
    VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
    const Comp = asChild ? Slot : 'span'

    return (
        <Comp
            data-slot="badge"
            className={cn(badgeVariants({ variant, size }), className)}
            {...props}
        />
    )
}

export { Badge, badgeVariants }
