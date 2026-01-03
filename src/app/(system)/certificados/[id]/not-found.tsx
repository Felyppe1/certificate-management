import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FileX2, Home } from 'lucide-react'

export default function CertificateNotFound() {
    return (
        <>
            <Card className="max-w-[20rem] md:max-w-lg w-full m-auto">
                <CardContent className="flex flex-col items-center text-center gap-6 py-8">
                    <div className="relative">
                        <div className="absolute inset-0 bg-destructive/70 rounded-full blur-3xl animate-pulse" />
                        <FileX2 className="size-14 md:size-18 text-destructive" />
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                            Certificado não encontrado
                        </h1>
                        {/* <p className="text-muted-foreground">
                            O certificado que você está procurando não existe ou
                            foi removido.
                        </p> */}
                    </div>

                    <Button asChild size="lg">
                        <Link href="/">
                            <Home className="size-5" />
                            Voltar ao início
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        </>
    )
}
