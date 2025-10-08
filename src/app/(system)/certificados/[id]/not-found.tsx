import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FileX2, Home } from 'lucide-react'

export default function CertificateNotFound() {
    return (
        <>
            <Card className="max-w-2xl w-full m-auto">
                <CardContent className="flex flex-col items-center text-center gap-6 py-12">
                    <div className="relative">
                        <div className="absolute inset-0 bg-destructive/20 rounded-full blur-2xl" />
                        <div className="relative bg-destructive/10 p-6 rounded-full">
                            <FileX2 className="size-16 text-destructive" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-3xl font-bold text-foreground">
                            Certificado não encontrado
                        </h1>
                        <p className="text-lg text-muted-foreground max-w-md mx-auto">
                            O certificado que você está procurando não existe ou
                            foi removido.
                        </p>
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
