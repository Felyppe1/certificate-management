'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Link, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { addTemplateByUrlAction } from '@/backend/infrastructure/server-actions/add-template-by-url-action'

export default function CreateTemplatePage() {
    const router = useRouter()
    const [selectedOption, setSelectedOption] = useState<string | null>(null)
    const [fileUrl, setFileUrl] = useState('')
    const [, action, isLoading] = useActionState(addTemplateByUrlAction, null)

    const handleOptionSelect = (value: string) => {
        setSelectedOption(value)
        if (value !== 'link') {
            setFileUrl('')
        }
    }

    // const handleConfirm = () => {
    //     if (selectedOption === "link" && fileUrl.trim()) {
    //         const formData = new FormData()
    //         formData.append("fileUrl", fileUrl.trim())

    //         try {
    //             startTransition(() => {
    //                 action(formData)
    //             })
    //         } catch (error) {

    //         }
    //     }
    // }

    const handleGoBack = () => {
        router.back()
    }

    return (
        <div className="container mx-auto py-8 px-4 max-w-4xl">
            <div className="mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGoBack}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Voltar
                    </Button>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Template do Certificado
                </h1>
            </div>

            {/* Options Grid */}
            <RadioGroup
                value={selectedOption || ''}
                onValueChange={handleOptionSelect}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Upload Local */}
                    <Card
                        className={`cursor-pointer transition-colors hover:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${
                            selectedOption === 'upload'
                                ? 'border-blue-500 bg-blue-50'
                                : ''
                        }`}
                        onClick={() => handleOptionSelect('upload')}
                    >
                        <CardContent className="text-center">
                            <div className="flex justify-center items-center gap-3 mb-4">
                                <RadioGroupItem
                                    disabled={isLoading}
                                    value="upload"
                                    className="sr-only"
                                />
                                <Upload className="w-12 h-12 text-blue-500" />
                            </div>
                            <CardTitle className="mb-2">Upload Local</CardTitle>
                            <CardDescription>
                                Envie um arquivo do seu computador
                            </CardDescription>
                        </CardContent>
                    </Card>

                    {/* Google Drive */}
                    <Card
                        className={`cursor-pointer transition-colors hover:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${
                            selectedOption === 'drive'
                                ? 'border-blue-500 bg-blue-50'
                                : ''
                        }`}
                        onClick={() => handleOptionSelect('drive')}
                    >
                        <CardContent className="text-center">
                            <div className="flex justify-center items-center gap-3 mb-4">
                                <RadioGroupItem
                                    disabled={isLoading}
                                    value="drive"
                                    className="sr-only"
                                />
                                <FileText className="w-12 h-12 text-blue-500" />
                            </div>
                            <CardTitle className="mb-2">Google Drive</CardTitle>
                            <CardDescription>
                                Selecione um arquivo do seu Google Drive
                            </CardDescription>
                        </CardContent>
                    </Card>

                    {/* Link de compartilhamento */}
                    <Card
                        className={`cursor-pointer transition-colors hover:border-blue-300 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 ${
                            selectedOption === 'link'
                                ? 'border-blue-500 bg-blue-50'
                                : ''
                        }`}
                        onClick={() => handleOptionSelect('link')}
                    >
                        <CardContent className="text-center">
                            <div className="flex justify-center items-center gap-3 mb-4">
                                <RadioGroupItem
                                    disabled={isLoading}
                                    value="link"
                                    className="sr-only"
                                />
                                <Link className="w-12 h-12 text-blue-500" />
                            </div>
                            <CardTitle className="mb-2">
                                Link de compartilhamento
                            </CardTitle>
                            <CardDescription>
                                Cole o link de um Google Docs ou Slides
                            </CardDescription>
                        </CardContent>
                    </Card>
                </div>
            </RadioGroup>

            {/* Link Input Form */}
            {selectedOption === 'link' && (
                <Card>
                    <CardHeader>
                        <CardTitle>Link do arquivo</CardTitle>
                        <CardDescription>
                            Cole o link de compartilhamento do Google Docs ou
                            Google Slides
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form action={action} className="flex gap-3">
                            <Input
                                type="url"
                                name="fileUrl"
                                value={fileUrl}
                                onChange={e => setFileUrl(e.target.value)}
                                placeholder="Cole o link de compartilhamento do Google Docs ou Google Slides"
                                className="flex-1"
                            />
                            <Button
                                // onClick={handleConfirm}
                                disabled={!fileUrl.trim() || isLoading}
                            >
                                Confirmar
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
