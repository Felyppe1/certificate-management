'use client'

import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../ui/card'
import { Link, Upload, Loader2 } from 'lucide-react'
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
import { DATA_SOURCE_MIME_TYPE } from '@/backend/domain/data-source'
import { TEMPLATE_FILE_MIME_TYPE } from '@/backend/domain/template'
import { GoogleDriveIcon } from '../svg/GoogleDriveIcon'
import { toast } from 'sonner'
import { useGoogleRelogin } from '../useGoogleRelogin'
import { UseFormReturn } from 'react-hook-form'
import { UrlForm, UrlFormValues } from './UrlForm'

export type SelectOption = 'upload' | 'link' | 'drive'

export type FileSelectorType = 'template' | 'data-source'

interface FileSelectorProps {
    isDriveLoading: boolean
    isUploadLoading: boolean
    urlForm: UseFormReturn<UrlFormValues>
    onSubmitUrl: (data: UrlFormValues) => void
    onSubmitDrive: (fileIds: string[]) => void
    onSubmitUpload: (files: File[]) => void
    userEmail: string
    googleOAuthToken: string | null
    radioGroupName: string
    type: FileSelectorType
}

export function FileSelector({
    urlForm,
    onSubmitUrl,
    onSubmitDrive,
    onSubmitUpload,
    isDriveLoading,
    isUploadLoading,
    userEmail,
    googleOAuthToken,
    radioGroupName,
    type,
}: FileSelectorProps) {
    const [selectedOption, setSelectedOption] = useState<SelectOption | null>(
        null,
    )

    const [isRefreshTokenLoading, startRefreshTokenTransition] = useTransition()
    const [pickerIsReady, setPickerIsReady] = useState(false)
    const pickerRef = useRef<any>(null)

    const handleOptionSelect = async (value: SelectOption) => {
        setSelectedOption(value)

        if (value !== 'link') {
            urlForm.reset()
        }
    }

    const handlePickerPicked = (event: PickerPickedEvent) => {
        console.log('Picker picked:', event)
        const docs = event.detail.docs as { mimeType: string; id: string }[] // TODO: real typing

        if (type === 'data-source' && docs.length > 1) {
            const allImages = docs.every(
                doc =>
                    doc.mimeType === DATA_SOURCE_MIME_TYPE.PNG ||
                    doc.mimeType === DATA_SOURCE_MIME_TYPE.JPEG,
            )
            if (!allImages) {
                toast.error(
                    'Só é possível enviar mais de um arquivo se forem imagens',
                )
                setSelectedOption(null)
                setPickerIsReady(false)
                return
            }
            if (docs.length > 4) {
                toast.error('É permitido no máximo 4 imagens por vez')
                setSelectedOption(null)
                setPickerIsReady(false)
                return
            }
        }

        const fileIds = docs.map(doc => doc.id)

        if (type === 'template') {
            onSubmitDrive([fileIds[0]])
        } else {
            onSubmitDrive(fileIds)
        }
        setPickerIsReady(false)
    }

    const handlePickerClosed = (event: PickerCanceledEvent) => {
        console.log('Picker closed:', event)

        setSelectedOption(null)
        setPickerIsReady(false)
    }

    const handlePickerError = (event: PickerErrorEvent) => {
        console.error('Picker error:', event)

        setSelectedOption(null)
        setPickerIsReady(false)
    }

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length === 0) return

        if (acceptedFiles.length > 1) {
            const allImages = acceptedFiles.every(
                f =>
                    f.type === DATA_SOURCE_MIME_TYPE.PNG ||
                    f.type === DATA_SOURCE_MIME_TYPE.JPEG,
            )
            if (!allImages) {
                toast.error(
                    'Só é possível enviar mais de um arquivo se forem imagens',
                )
                return
            }
        }

        const file = acceptedFiles[0]

        if (
            file.type != TEMPLATE_FILE_MIME_TYPE.DOCX &&
            file.type != TEMPLATE_FILE_MIME_TYPE.PPTX &&
            file.type != DATA_SOURCE_MIME_TYPE.CSV &&
            file.type != DATA_SOURCE_MIME_TYPE.XLSX &&
            file.type != DATA_SOURCE_MIME_TYPE.PNG &&
            file.type != DATA_SOURCE_MIME_TYPE.JPEG
        ) {
            toast.error('Formato de arquivo não suportado')
            return
        }

        onSubmitUpload(acceptedFiles)
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
            toast.error('É permitido no máximo 4 imagens por vez')
        }

        if (fileTooLarge) {
            toast.error('O arquivo é muito grande')
        }
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        onDropRejected,
        maxFiles: type === 'data-source' ? 4 : 1,
        maxSize: 5 * 1024 * 1024, // 5MB
        multiple: type === 'data-source',
        accept:
            type === 'template'
                ? {
                      [TEMPLATE_FILE_MIME_TYPE.PPTX]: ['.pptx'],
                      [TEMPLATE_FILE_MIME_TYPE.DOCX]: ['.docx'],
                  }
                : {
                      [DATA_SOURCE_MIME_TYPE.CSV]: ['.csv'],
                      [DATA_SOURCE_MIME_TYPE.XLSX]: ['.xlsx'],
                      [DATA_SOURCE_MIME_TYPE.PNG]: ['.png'],
                      [DATA_SOURCE_MIME_TYPE.JPEG]: ['.jpeg', '.jpg'],
                  },
    })

    const { login, isLoading: googleReloginIsLoading } = useGoogleRelogin({
        userEmail,
        onError: error => {
            setSelectedOption(null)
            console.error('Login Failed:', error)
        },
        onNonOAuthError: err => {
            setSelectedOption(null)
        },
    })

    useEffect(() => {
        setPickerIsReady(false)

        if (selectedOption !== 'drive' || !googleOAuthToken) return

        const manageAuthFlow = async () => {
            // Just to verify if the token is valid
            const verifyToken = async (token: string) => {
                try {
                    const response = await fetch(
                        'https://www.googleapis.com/drive/v3/about?fields=user',
                        {
                            method: 'GET',
                            headers: { Authorization: `Bearer ${token}` },
                        },
                    )
                    return response.ok
                } catch (error) {
                    return false
                }
            }

            const isValid = await verifyToken(googleOAuthToken)

            if (isValid) {
                setPickerIsReady(true)
                return
            }

            try {
                // TODO: change to mutation?
                const response = await refreshGoogleAccessTokenAction()

                if (!response.success) {
                    throw new Error('Failed to refresh access token')
                }

                // if refresh is successful, it will invalidate the fetch and this effect will rerun
            } catch (error) {
                toast.error('Sessão expirada. Por favor, faça login novamente.')
                login()
            }
        }

        manageAuthFlow()
    }, [selectedOption, googleOAuthToken, login])

    useEffect(() => {
        if (!pickerIsReady || !pickerRef.current) return

        const pickerRefCurrent = pickerRef.current

        import('@googleworkspace/drive-picker-element')

        // const handlePicked = (e: any) => handlePickerPicked(e) // Wrapper para garantir tipagem se necessário

        pickerRefCurrent.addEventListener('picker:picked', handlePickerPicked)
        pickerRefCurrent.addEventListener('picker:canceled', handlePickerClosed)
        pickerRefCurrent.addEventListener('picker:error', handlePickerError)

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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pickerIsReady])

    const allAreLoading =
        isDriveLoading ||
        isUploadLoading ||
        urlForm.formState.isSubmitting ||
        isRefreshTokenLoading

    return (
        <div className="flex flex-col">
            {/* Options Grid */}
            <RadioGroup
                value={selectedOption || ''}
                onValueChange={handleOptionSelect}
            >
                <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 sm:gap-4">
                    {/* Upload Local */}
                    <label
                        htmlFor={`option-upload-${radioGroupName}`}
                        className="group relative"
                    >
                        <Card className="relative h-full cursor-pointer group-has-[:disabled]:opacity-60 group-has-[:disabled]:pointer-events-none group-has-[:disabled]:cursor-default hover:border-primary group-has-[[data-state=checked]]:border-primary group-has-[[data-state=checked]]:bg-primary/5 focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/50 max-xs:px-[10%] max-xs:py-3 p-4 max-md:py-6 text-center gap-[10%] xs:gap-0 md:!gap-0 content-center flex-row xs:flex-col justify-evenly xs:justify-center">
                            <RadioGroupItem
                                id={`option-upload-${radioGroupName}`}
                                disabled={allAreLoading}
                                value="upload"
                                className="sr-only"
                            />
                            <div className="flex justify-center items-center gap-3 mb-2 xs:mb-4">
                                <Upload className="w-9 h-9 xs:w-10 xs:h-10 md:w-12 md:h-12 transition-colors group-has-[[data-state=checked]]:text-primary text-muted-foreground" />
                            </div>
                            <div className="w-fit xs:w-auto">
                                <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2">
                                    Upload Local
                                </h3>
                                <p className="text-muted-foreground max-sm:text-xs max-md:text-sm">
                                    Envie um arquivo do seu computador
                                </p>
                            </div>
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
                        <Card className="h-full cursor-pointer group-has-[:disabled]:opacity-60 group-has-[:disabled]:pointer-events-none hover:group-has-[:disabled]:none hover:border-primary group-has-[[data-state=checked]]:border-primary group-has-[[data-state=checked]]:bg-primary/5 focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/50 max-xs:px-[10%] max-xs:py-3 p-4 max-md:py-6 text-center gap-[10%] xs:gap-0 md:!gap-0 content-center flex-row xs:flex-col justify-evenly xs:justify-center">
                            <RadioGroupItem
                                id={`option-drive-${radioGroupName}`}
                                disabled={allAreLoading}
                                value="drive"
                                className="sr-only"
                            />
                            <div className="flex justify-center items-center gap-3 mb-2 xs:mb-4">
                                <GoogleDriveIcon className="w-9 h-9 xs:w-10 xs:h-10 md:w-12 md:h-12 transition-colors group-has-[[data-state=checked]]:text-primary text-muted-foreground" />
                            </div>
                            <div className="w-fit xs:w-auto">
                                <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2">
                                    Google Drive
                                </h3>
                                <p className="text-muted-foreground max-sm:text-xs max-md:text-sm">
                                    Selecione um arquivo do seu Google Drive
                                </p>
                            </div>
                        </Card>
                        {(isDriveLoading ||
                            isRefreshTokenLoading ||
                            googleReloginIsLoading) && (
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
                        <Card className="h-full cursor-pointer group-has-[:disabled]:opacity-60 group-has-[:disabled]:pointer-events-none hover:border-primary group-has-[[data-state=checked]]:border-primary group-has-[[data-state=checked]]:bg-primary/5 focus-within:border-primary focus-within:ring-3 focus-within:ring-ring/50 max-xs:px-[10%] max-xs:py-3 p-4 max-md:py-6 text-center gap-[10%] xs:gap-0 md:!gap-0 content-center flex-row xs:flex-col justify-evenly xs:justify-center">
                            <RadioGroupItem
                                id={`option-link-${radioGroupName}`}
                                disabled={allAreLoading}
                                value="link"
                                className="sr-only"
                            />
                            <div className="flex justify-center items-center gap-3 mb-2 xs:mb-4">
                                <Link className="w-9 h-9 xs:w-10 xs:h-10 md:w-12 md:h-12 transition-colors group-has-[[data-state=checked]]:text-primary text-muted-foreground" />
                            </div>
                            <div className="w-fit xs:w-auto">
                                <h3 className="text-sm sm:text-base md:text-lg font-semibold mb-2 xs:max-sm:break-all">
                                    Link de compartilhamento
                                </h3>
                                <p className="text-muted-foreground max-sm:text-xs max-md:text-sm">
                                    Cole o link de um arquivo do Drive
                                </p>
                            </div>
                        </Card>
                        {urlForm.formState.isSubmitting && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-background/80 rounded-full p-2">
                                    <Loader2 className="w-10 h-10 animate-spin text-foreground" />
                                </div>
                            </div>
                        )}
                    </label>
                </div>
            </RadioGroup>

            <div className="flex flex-wrap gap-x-2.5 justify-center items-center text-muted-foreground mt-3">
                <p className="text-xs">
                    Arquivos aceitos:{' '}
                    {type === 'data-source'
                        ? 'Google Planilhas, .csv, .xlsx, .png ou .jpeg (imagens: até 4)'
                        : 'Google Slides, Google Docs, .pptx ou .docx'}
                </p>
                <p>·</p>
                <p className="text-xs">
                    Tamanho máximo: {type === 'data-source' ? '2MB' : '5MB'}
                </p>
                {type === 'data-source' && (
                    <>
                        <p>·</p>
                        <p className="text-xs">Máximo de 300 linhas</p>
                    </>
                )}
            </div>

            {selectedOption === 'drive' &&
                googleOAuthToken &&
                pickerIsReady && (
                    <drive-picker
                        ref={pickerRef}
                        client-id={process.env.GOOGLE_CLIENT_ID}
                        app-id={process.env.GCP_PROJECT_ID}
                        oauth-token={googleOAuthToken!}
                        {...(type === 'data-source' && {
                            multiselect: true,
                        })}
                    >
                        <drive-picker-docs-view
                            mime-types={(type === 'template'
                                ? [
                                      TEMPLATE_FILE_MIME_TYPE.GOOGLE_DOCS,
                                      TEMPLATE_FILE_MIME_TYPE.GOOGLE_SLIDES,
                                      TEMPLATE_FILE_MIME_TYPE.DOCX,
                                      TEMPLATE_FILE_MIME_TYPE.PPTX,
                                  ]
                                : [
                                      DATA_SOURCE_MIME_TYPE.CSV,
                                      DATA_SOURCE_MIME_TYPE.XLSX,
                                      DATA_SOURCE_MIME_TYPE.GOOGLE_SHEETS,
                                      DATA_SOURCE_MIME_TYPE.PNG,
                                      DATA_SOURCE_MIME_TYPE.JPEG,
                                  ]
                            ).join(',')}
                        ></drive-picker-docs-view>
                    </drive-picker>
                )}

            <div className="mt-6">
                {/* Link Input Form */}
                {selectedOption === 'link' && (
                    <Card className="max-sm:px-3 max-sm:py-4">
                        <CardHeader>
                            <CardTitle>Link do arquivo</CardTitle>
                            <CardDescription>
                                Cole o link de compartilhamento do arquivo
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <UrlForm
                                urlForm={urlForm}
                                onSubmitUrl={onSubmitUrl}
                                type={type}
                            />
                        </CardContent>
                    </Card>
                )}

                {/* Upload Input Form */}
                {selectedOption === 'upload' && (
                    <Card
                        {...getRootProps()}
                        className={cn(
                            'relative border-2 border-dashed h-[7rem] sm:h-[10rem]',
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
                                <h4 className="text-base sm:text-lg text-center font-medium">
                                    Solte o arquivo aqui...
                                </h4>
                            ) : (
                                <>
                                    <h4 className="text-base sm:text-lg text-center font-medium text-foreground/70 hover:text-foreground max-xs:max-w-[17rem]">
                                        Clique para enviar
                                        <br />
                                        ou
                                        <br />
                                        Arraste o arquivo aqui
                                    </h4>
                                    <h4></h4>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
