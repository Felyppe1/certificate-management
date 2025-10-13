export interface GenerateSignedUrlInput {
    filePath: string
    mimeType?: string
    action: 'read' | 'write'
    bucketName: string
}

export interface UploadObjectInput {
    buffer: Buffer
    bucketName: string
    objectName: string
    mimeType: string
}

export interface DeleteObjectInput {
    objectName: string
    bucketName: string
}

export interface IBucket {
    generateSignedUrl(input: GenerateSignedUrlInput): Promise<string>
    uploadObject(input: UploadObjectInput): Promise<string>
    deleteObject(input: DeleteObjectInput): Promise<void>
}
