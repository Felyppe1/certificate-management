'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { HiOutlineLightBulb } from 'react-icons/hi'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const TIPS_STORAGE_KEY = 'certificate-tips-dismissed'

const tips = [
    {
        title: 'Use Variáveis',
        description:
            'Você pode inserir variáveis no seu template usando chaves duplas, como <code class="bg-blue-900 px-1 rounded">{{ nome }}</code>.',
    },
    {
        title: 'Mapeamento',
        description:
            'Ao adicionar variáveis no template, você pode escolher quais colunas da fonte de dados vão substituí-las na geração.',
    },
    {
        title: 'Veja a Prévia',
        description:
            'Após gerar os certificados, você pode visualizar os PDFs gerados ou baixá-los todos de uma vez.',
    },
]

export function TipsButton() {
    const [currentTip, setCurrentTip] = useState(0)
    const [open, setOpen] = useState(false)
    const [dontShowAgain, setDontShowAgain] = useState(false)

    useEffect(() => {
        const dismissed = localStorage.getItem(TIPS_STORAGE_KEY)
        if (!dismissed) {
            setOpen(true)
        } else {
            setDontShowAgain(true)
        }
    }, [])

    const handleDismiss = () => {
        if (dontShowAgain) {
            localStorage.setItem(TIPS_STORAGE_KEY, 'true')
        }
        setOpen(false)
    }

    const goToPrevious = () => {
        setCurrentTip(prev => (prev > 0 ? prev - 1 : tips.length - 1))
    }

    const goToNext = () => {
        setCurrentTip(prev => (prev < tips.length - 1 ? prev + 1 : 0))
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                    <HiOutlineLightBulb className="size-4 sm:size-5" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[13rem] sm:w-80 bg-blue-800 text-zinc-100 p-4 sm:p-5"
                side="left"
                align="start"
            >
                <div className="space-y-2">
                    <h4 className="font-semibold text-base sm:text-lg">
                        Dica {currentTip + 1}/{tips.length}:{' '}
                        {tips[currentTip].title}
                    </h4>
                    <div
                        className="text-zinc-200 text-xs sm:text-sm leading-relaxed"
                        dangerouslySetInnerHTML={{
                            __html: tips[currentTip].description,
                        }}
                    />
                    <div className="flex justify-between pt-2">
                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                size="icon-sm"
                                // className="h-8 w-8"
                                onClick={goToPrevious}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon-sm"
                                // className="h-8 w-8"
                                onClick={goToNext}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex flex-col items-end">
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleDismiss}
                                className="bg-zinc-100 hover:bg-zinc-300 text-blue-800"
                            >
                                Entendi
                            </Button>
                            <div className="flex items-center gap-1 sm:gap-2 mt-1">
                                <label
                                    htmlFor="dont-show-again"
                                    className="text-[.6rem] sm:text-xs text-zinc-200 cursor-pointer select-none"
                                >
                                    Não mostrar de novo
                                </label>

                                <input
                                    type="checkbox"
                                    id="dont-show-again"
                                    checked={dontShowAgain}
                                    onChange={e =>
                                        setDontShowAgain(e.target.checked)
                                    }
                                    className="h-3 w-3 rounded border-zinc-300 cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
