'use client'

import { RadioGroup, RadioGroupItem } from '@radix-ui/react-radio-group'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../ui/card'
import { FileText, Link, Upload } from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useState } from 'react'

type SelectOption = 'upload' | 'link' | 'drive'

interface FileSelectorProps {
    isLoading: boolean
    onSubmitUrl: (formData: FormData) => void
    // urlAction: (_: unknown, formData: FormData) => Promise<any> // TODO: improve this type
}

export function FileSelector({ onSubmitUrl, isLoading }: FileSelectorProps) {
    const [selectedOption, setSelectedOption] = useState<SelectOption | null>(
        null,
    )
    const [fileUrl, setFileUrl] = useState('')

    const handleOptionSelect = (value: SelectOption) => {
        setSelectedOption(value)

        if (value !== 'link') {
            setFileUrl('')
        }
    }

    const handleSubmitUrl = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData(e.currentTarget as HTMLFormElement)
        onSubmitUrl(formData)
    }

    return (
        <div className="flex flex-col">
            {/* Options Grid */}
            <RadioGroup
                value={selectedOption || ''}
                onValueChange={handleOptionSelect}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    {/* Upload Local */}
                    <Card
                        className={`cursor-pointer transition-colors hover:border-primary focus-within:ring-3 focus-within:ring-ring/50 focus-within:border-ring ${
                            selectedOption === 'upload'
                                ? 'border-primary bg-primary/5'
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
                                <Upload
                                    className={`w-12 h-12 ${selectedOption === 'upload' ? 'text-primary' : 'text-muted-foreground'}`}
                                />
                            </div>
                            <CardTitle className="mb-2">Upload Local</CardTitle>
                            <CardDescription>
                                Envie um arquivo do seu computador
                            </CardDescription>
                        </CardContent>
                    </Card>

                    {/* Google Drive */}
                    <Card
                        className={`cursor-pointer transition-colors hover:border-primary focus-within:ring-3 focus-within:ring-ring/50 focus-within:border-ring ${
                            selectedOption === 'drive'
                                ? 'border-primary bg-primary/5'
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
                                <FileText
                                    className={`w-12 h-12 ${selectedOption === 'drive' ? 'text-primary' : 'text-muted-foreground'}`}
                                />
                            </div>
                            <CardTitle className="mb-2">Google Drive</CardTitle>
                            <CardDescription>
                                Selecione um arquivo do seu Google Drive
                            </CardDescription>
                        </CardContent>
                    </Card>

                    {/* Link de compartilhamento */}
                    <Card
                        className={`cursor-pointer transition-colors hover:border-primary focus-within:ring-3 focus-within:ring-ring/50 focus-within:border-ring ${
                            selectedOption === 'link'
                                ? 'border-primary bg-primary/5'
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
                                <Link
                                    className={`w-12 h-12 ${selectedOption === 'link' ? 'text-primary' : 'text-muted-foreground'}`}
                                />
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
                        <form onSubmit={handleSubmitUrl} className="flex gap-3">
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
