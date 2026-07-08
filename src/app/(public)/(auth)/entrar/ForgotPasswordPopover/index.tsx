'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Loader2 } from 'lucide-react'
import { useForgotPasswordPopover } from './useForgotPasswordPopover'

export function ForgotPasswordPopover() {
    const { isOpen, setIsOpen, form, onSubmit, isSubmitting, errors } =
        useForgotPasswordPopover()

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-sm font-semibold text-primary"
                    data-testid="forgot-password-trigger"
                >
                    Esqueceu a senha?
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[16rem] xs:w-80"
                avoidCollisions
                side="bottom"
                align="end"
                collisionPadding={16}
            >
                <form
                    onSubmit={e => {
                        e.stopPropagation()
                        onSubmit(e)
                    }}
                    className="space-y-4"
                >
                    <p className="font-medium">Recuperar senha</p>
                    <div className="space-y-2">
                        <Label htmlFor="reset-email">E-mail</Label>
                        <Input
                            id="reset-email"
                            type="email"
                            placeholder="nome@email.com"
                            disabled={isSubmitting}
                            {...form.register('email')}
                        />
                        {errors.email && (
                            <p className="text-sm text-destructive">
                                {errors.email.message}
                            </p>
                        )}
                    </div>
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
                        data-testid="send-reset-code-button"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            'Enviar código'
                        )}
                    </Button>
                </form>
            </PopoverContent>
        </Popover>
    )
}
