'use client'

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface GoogleAccountWarningPopoverProps {
    email: string | null | undefined
}

export function GoogleAccountWarningPopover({
    email,
}: GoogleAccountWarningPopoverProps) {
    if (!email) return null

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-amber-500 hover:text-amber-600 transition-colors"
                    aria-label="Aviso de conta Google"
                >
                    <AlertTriangle className="size-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[16rem] sm:w-80 px-4 sm:px-5 py-4"
                align="center"
            >
                <div className="space-y-4">
                    <div className="flex flex-col gap-2">
                        {/* <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 text-orange-600 dark:text-orange-400 mt-0.5">
                                <AlertTriangle className="size-4 sm:size-5" />
                            </div>
                            <h4 className="font-semibold text-sm sm:text-base leading-tight">
                                Aviso de conta Google
                            </h4>
                        </div> */}
                        <div className="flex-1 space-y-1 mt-1">
                            <p className="text-xs sm:text-sm text-foreground/90">
                                Essa fonte de dados foi adicionada com a conta{' '}
                                <span className="font-semibold text-foreground">
                                    {email}
                                </span>
                                .
                            </p>
                            <p className="text-xs sm:text-sm text-foreground/90 mt-2">
                                Como você está usando outra conta Google, a
                                atualização pode não funcionar se você não tiver
                                acesso.
                            </p>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
