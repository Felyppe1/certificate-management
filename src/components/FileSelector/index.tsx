'use client'

import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../ui/card'
import { FileText, Link, Upload, Loader2 } from 'lucide-react'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import {
    PickerCanceledEvent,
    PickerErrorEvent,
    PickerPickedEvent,
} from '@googleworkspace/drive-picker-element'
import { refreshGoogleAccessTokenAction } from '@/backend/infrastructure/server-actions/refresh-google-access-token-action'
// import { createWriteBucketSignedUrlAction } from '@/backend/infrastructure/server-actions/create-write-bucket-signed-url-action'
import { FileRejection, useDropzone } from 'react-dropzone'
import { cn } from '@/lib/utils'
import { DATA_SOURCE_FILE_EXTENSION } from '@/backend/domain/data-source'
import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'

type SelectOption = 'upload' | 'link' | 'drive'

interface FileSelectorProps {
    isDriveLoading: boolean
    isUploadLoading: boolean
    isUrlLoading: boolean
    onSubmitUrl: (formData: FormData) => void
    onSubmitDrive: (fileId: string) => void
    onSubmitUpload: (file: File) => void
    googleOAuthToken: string | null
    googleOAuthTokenExpiry: Date | null
    radioGroupName: string
    // urlAction: (_: unknown, formData: FormData) => Promise<any> // TODO: improve this type
}

export function FileSelector({
    onSubmitUrl,
    onSubmitDrive,
    onSubmitUpload,
    isDriveLoading,
    isUploadLoading,
    isUrlLoading,
    googleOAuthToken,
    googleOAuthTokenExpiry,
    radioGroupName,
}: FileSelectorProps) {
    const [selectedOption, setSelectedOption] = useState<SelectOption | null>(
        null,
    )
    const [fileUrl, setFileUrl] = useState('')

    const [isRefreshTokenLoading, startRefreshTokenTransition] = useTransition()

    const pickerRef = useRef<any>(null)

    const handleOptionSelect = async (value: SelectOption) => {
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

    const handlePickerPicked = (event: PickerPickedEvent) => {
        console.log('Picker picked:', event)
        const fileId = event.detail.docs[0].id

        onSubmitDrive(fileId)
    }

    const handlePickerClosed = (event: PickerCanceledEvent) => {
        console.log('Picker closed:', event)

        setSelectedOption(null)
    }

    const handlePickerError = (event: PickerErrorEvent) => {
        console.error('Picker error:', event)

        setSelectedOption(null)
    }

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return

        const file = acceptedFiles[0]

        if (
            file.type != TEMPLATE_FILE_EXTENSION.DOCX &&
            file.type != TEMPLATE_FILE_EXTENSION.PPTX
        ) {
            console.log('Formato de arquivo não suportado')
            return
        }

        onSubmitUpload(file)
    }, [])

    const onDropRejected = useCallback((fileRejections: FileRejection[]) => {
        if (fileRejections.length === 0) return

        const tooManyFiles = fileRejections.find(
            fileRejection => fileRejection.errors[0].code === 'too-many-files',
        )

        const fileTooLarge = fileRejections.find(
            fileRejection => fileRejection.errors[0].code === 'file-too-large',
        )

        if (tooManyFiles) {
            console.log('Somente um arquivo é permitido')
        }

        if (fileTooLarge) {
            console.log('O arquivo é muito grande')
        }
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        onDropRejected,
        maxFiles: 1,
        maxSize: 5 * 1024 * 1024, // 5MB
    })

    useEffect(() => {
        if (selectedOption !== 'drive') return

        const pickerRefCurrent = pickerRef.current

        if (!pickerRefCurrent) return

        const initPicker = async () => {
            if (!googleOAuthToken) {
                alert(
                    'Google OAuth token is missing. Please authenticate first.',
                )
                return
            }

            // TODO: melhorar essa lógica? se passou no if de cima, é pq tem o expiry tbm
            if (new Date(googleOAuthTokenExpiry!) < new Date()) {
                startRefreshTokenTransition(() => {
                    refreshGoogleAccessTokenAction()
                })

                return
            }

            import('@googleworkspace/drive-picker-element')

            pickerRefCurrent.addEventListener(
                'picker:picked',
                handlePickerPicked,
            )
            pickerRefCurrent.addEventListener(
                'picker:canceled',
                handlePickerClosed,
            )
            pickerRefCurrent.addEventListener('picker:error', handlePickerError)
        }

        initPicker()

        return () => {
            pickerRefCurrent.removeEventListener(
                'picker:picked',
                handlePickerPicked,
            )
            pickerRefCurrent.removeEventListener(
                'picker:canceled',
                handlePickerClosed,
            )
            pickerRefCurrent.removeEventListener(
                'picker:error',
                handlePickerError,
            )
        }
    }, [selectedOption, googleOAuthToken])

    const allAreLoading =
        isDriveLoading ||
        isUploadLoading ||
        isUrlLoading ||
        isRefreshTokenLoading

    return (
        <div className="flex flex-col">
            {/* Options Grid */}
            <RadioGroup
                value={selectedOption || ''}
                onValueChange={handleOptionSelect}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Upload Local */}
                    <label
                        htmlFor={`option-upload-${radioGroupName}`}
                        className="group relative"
                    >
                        <Card className="h-full justify-center cursor-pointer group-has-[:disabled]:opacity-60 group-has-[:disabled]:pointer-events-none group-has-[:disabled]:cursor-default hover:border-primary group-has-[[data-state=checked]]:border-primary group-has-[[data-state=checked]]:bg-primary/5 focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/50 p-6 text-center gap-0 content-center">
                            <RadioGroupItem
                                id={`option-upload-${radioGroupName}`}
                                disabled={allAreLoading}
                                value="upload"
                                className="sr-only"
                            />
                            <div className="flex justify-center items-center gap-3 mb-4">
                                <Upload className="w-12 h-12 transition-colors group-has-[[data-state=checked]]:text-primary text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">
                                Upload Local
                            </h3>
                            <p className="text-muted-foreground">
                                Envie um arquivo do seu computador
                            </p>
                        </Card>
                        {isUploadLoading && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-background/80 rounded-full p-2">
                                    <Loader2 className="w-10 h-10 animate-spin text-foreground" />
                                </div>
                            </div>
                        )}
                    </label>

                    {/* Google Drive */}
                    <label
                        htmlFor={`option-drive-${radioGroupName}`}
                        className="group relative"
                    >
                        <Card className="h-full justify-center cursor-pointer group-has-[:disabled]:opacity-60 group-has-[:disabled]:pointer-events-none hover:group-has-[:disabled]:none hover:border-primary group-has-[[data-state=checked]]:border-primary group-has-[[data-state=checked]]:bg-primary/5 focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/50 p-6 text-center gap-0 content-center">
                            <RadioGroupItem
                                id={`option-drive-${radioGroupName}`}
                                disabled={allAreLoading}
                                value="drive"
                                className="sr-only"
                            />
                            <div className="flex justify-center items-center gap-3 mb-4">
                                <FileText className="w-12 h-12 transition-colors group-has-[[data-state=checked]]:text-primary text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">
                                Google Drive
                            </h3>
                            <p className="text-muted-foreground">
                                Selecione um arquivo do seu Google Drive
                            </p>
                        </Card>
                        {(isDriveLoading || isRefreshTokenLoading) && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-background/80 rounded-full p-2">
                                    <Loader2 className="w-10 h-10 animate-spin text-foreground" />
                                </div>
                            </div>
                        )}
                    </label>

                    {/* Link de compartilhamento */}
                    <label
                        htmlFor={`option-link-${radioGroupName}`}
                        className="group relative"
                    >
                        <Card className="h-full justify-center cursor-pointer group-has-[:disabled]:opacity-60 group-has-[:disabled]:pointer-events-none hover:border-primary group-has-[[data-state=checked]]:border-primary group-has-[[data-state=checked]]:bg-primary/5 focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/50 p-6 text-center gap-0 content-center">
                            <RadioGroupItem
                                id={`option-link-${radioGroupName}`}
                                disabled={allAreLoading}
                                value="link"
                                className="sr-only"
                            />
                            <div className="flex justify-center items-center gap-3 mb-4">
                                <Link className="w-12 h-12 transition-colors group-has-[[data-state=checked]]:text-primary text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">
                                Link de compartilhamento
                            </h3>
                            <p className="text-muted-foreground">
                                Cole o link de um Google Docs ou Slides
                            </p>
                        </Card>
                        {isUrlLoading && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-background/80 rounded-full p-2">
                                    <Loader2 className="w-10 h-10 animate-spin text-foreground" />
                                </div>
                            </div>
                        )}
                    </label>
                </div>
            </RadioGroup>

            {selectedOption === 'drive' && googleOAuthToken && (
                <drive-picker
                    ref={pickerRef}
                    client-id={process.env.GOOGLE_CLIENT_ID}
                    app-id={process.env.GCP_PROJECT_ID}
                    oauth-token={googleOAuthToken!}
                >
                    <drive-picker-docs-view
                        mime-types={[
                            TEMPLATE_FILE_EXTENSION.GOOGLE_DOCS,
                            TEMPLATE_FILE_EXTENSION.GOOGLE_SLIDES,
                            TEMPLATE_FILE_EXTENSION.DOCX,
                            TEMPLATE_FILE_EXTENSION.PPTX,
                            DATA_SOURCE_FILE_EXTENSION.CSV,
                            DATA_SOURCE_FILE_EXTENSION.XLSX,
                            DATA_SOURCE_FILE_EXTENSION.ODS,
                            DATA_SOURCE_FILE_EXTENSION.GOOGLE_SHEETS,
                        ].join(',')}
                    ></drive-picker-docs-view>
                </drive-picker>
            )}

            <div className="mt-6">
                {/* Link Input Form */}
                {selectedOption === 'link' && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Link do arquivo</CardTitle>
                            <CardDescription>
                                Cole o link de compartilhamento do Google Docs
                                ou Google Slides
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form
                                onSubmit={handleSubmitUrl}
                                className="flex gap-3"
                            >
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
                                    disabled={!fileUrl.trim() || isUrlLoading}
                                >
                                    Confirmar
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}

                {/* Upload Input Form */}
                {selectedOption === 'upload' && (
                    <Card
                        {...getRootProps()}
                        className={cn(
                            'relative border-2 border-dashed h-[10rem]',
                            isDragActive &&
                                'border-primary bg-primary/5 border-solid',
                            isUploadLoading
                                ? 'cursor-default opacity-60'
                                : 'cursor-pointer hover:border-primary',
                        )}
                    >
                        <CardContent className="flex flex-col items-center justify-center h-full w-full gap-3">
                            <input
                                {...getInputProps({
                                    disabled: isUploadLoading,
                                })}
                            />
                            {isDragActive ? (
                                <h4 className="text-lg font-semibold">
                                    Solte o arquivo aqui...
                                </h4>
                            ) : (
                                <>
                                    <h4 className="text-lg font-semibold">
                                        Clique para enviar ou arraste o arquivo
                                        aqui
                                    </h4>
                                    <p className="text-muted-foreground">
                                        Formatos suportados: .docx, .pptx (máx.
                                        5MB)
                                    </p>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
