'use client'

import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from '@/components/ui/carousel'
import Image from 'next/image'
import { Button } from '../ui/button'

const EXAMPLE_IMAGES = [
    { src: '/image1.png', alt: 'Exemplo de template 1' },
    { src: '/image2.png', alt: 'Exemplo de template 2' },
    { src: '/image3.png', alt: 'Exemplo de template 3' },
]

export function TemplateSyntaxCarousel() {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                    Exemplos
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[90vw] xs:w-[28rem] sm:w-[40rem] p-4"
                side="bottom"
            >
                <div className="mb-3 space-y-1">
                    <h4 className="font-medium leading-none text-sm sm:text-lg">
                        Exemplos de Templates
                    </h4>
                    {/* <p className="text-xs text-muted-foreground">
                        Como usar as variáveis Liquid no seu documento
                    </p> */}
                </div>
                <Carousel className="w-full mx-auto" opts={{ loop: true }}>
                    <CarouselContent>
                        {EXAMPLE_IMAGES.map((image, index) => (
                            <CarouselItem key={index}>
                                <div className="relative aspect-video w-full rounded-md overflow-hidden bg-muted/20 border border-border">
                                    <Image
                                        src={image.src}
                                        alt={image.alt}
                                        fill
                                        className="object-contain"
                                    />
                                </div>
                            </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-2 bg-background/60 hover:bg-background/80" />
                    <CarouselNext className="right-2 bg-background/60 hover:bg-background/80" />
                </Carousel>
            </PopoverContent>
        </Popover>
    )
}
