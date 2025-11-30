import { Storage } from '@google-cloud/storage'
import {
    DeleteObjectInput,
    DeleteObjectsWithPrefixInput,
    GenerateSignedUrlInput,
    IBucket,
    UploadObjectInput,
} from '@/backend/application/interfaces/ibucket'

export class GcpBucket implements IBucket {
    private storage = new Storage()

    async generateSignedUrl(input: GenerateSignedUrlInput): Promise<string> {
        const bucket = this.storage.bucket(input.bucketName)

        const file = bucket.file(input.filePath)

        const [url] = await file.getSignedUrl({
            action: input.action,
            version: 'v4',
            expires: Date.now() + 2 * 60 * 1000, // 2 minutes
            contentType: input.mimeType,
        })

        return url
    }

    async uploadObject(input: UploadObjectInput) {
        const bucket = this.storage.bucket(input.bucketName)

        const file = bucket.file(input.objectName)

        await file.save(input.buffer, {
            contentType: input.mimeType,
        })

        return file.publicUrl()
    }

    async deleteObject(input: DeleteObjectInput) {
        const bucket = this.storage.bucket(input.bucketName)

        const file = bucket.file(input.objectName)

        const [exists] = await file.exists()

        if (exists) {
            await file.delete()
        }
    }

    async deleteObjectsWithPrefix(input: DeleteObjectsWithPrefixInput) {
        const bucket = this.storage.bucket(input.bucketName)

        const [files] = await bucket.getFiles({ prefix: input.prefix })

        if (files.length === 0) {
            console.log('No objects found')
            return
        }

        await Promise.all(files.map(file => file.delete()))
    }

    async getObjectsWithPrefix(input: DeleteObjectsWithPrefixInput) {
        const bucket = this.storage.bucket(input.bucketName)

        const [files] = await bucket.getFiles({ prefix: input.prefix })

        return files
    }
}
