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
    {
        src: '/template1.png',
        alt: 'Modelo de Certificado de Premiação da West Village High School. O design possui bordas geométricas em tons de azul e dourado sobre um fundo branco. O texto inclui campos dinâmicos para o nome do premiado, área de desempenho, ano, categoria e assinatura do responsável.',
    },
    {
        src: '/template2.png',
        alt: 'Modelo de certificado de conclusão com design elegante em fundo preto texturizado e detalhes em dourado. O layout apresenta formas geométricas em "V" nas laterais e contém variáveis de código para preenchimento automático do nome do aluno, nome do curso, data formatada e uma assinatura digitalizada.',
    },
    {
        src: '/template3.png',
        alt: 'Modelo de certificado minimalista em preto e branco. O design é focado em tipografia robusta e centralizada, com um ícone de louros na parte inferior. O texto contém diversas variáveis de código para manipulação de strings, incluindo a substituição de "Workshop" por "Treinamento Intensivo", capitalização do nome e cálculo automático de validade.',
    },
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
