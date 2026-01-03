import z from 'zod'
import { TEMPLATE_FILE_EXTENSION } from '@/backend/domain/template'

// Certificate Emission
export const createCertificateEmissionSchema = z.object({
    name: z.string().min(1).max(100),
})

// Data Source
export const addDataSourceByDrivePickerSchema = z.object({
    certificateId: z.string().min(1),
    fileId: z.string().min(1),
})

export const addDataSourceByUrlSchema = z.object({
    certificateId: z.string().min(1),
    fileUrl: z.url(),
})

const MAXIMUM_FILE_SIZE = 5 * 1024 * 1024

export const addDataSourceByUploadSchema = z.object({
    certificateId: z.string().min(1),
    file: z.instanceof(File).refine(file => file.size <= MAXIMUM_FILE_SIZE, {
        message: 'File size must be less than 5MB',
    }),
})

export const deleteDataSourceSchema = z.object({
    certificateId: z.string().min(1),
})

export const refreshDataSourceSchema = z.object({
    certificateId: z.string().min(1),
})

export const downloadDataSourceSchema = z.object({
    certificateEmissionId: z.string().min(1),
})

// Template
export const addTemplateByUrlSchema = z.object({
    certificateId: z.string().min(1),
    fileUrl: z.url(),
})

export const addTemplateByDrivePickerSchema = z.object({
    certificateId: z.string().min(1),
    fileId: z.string().min(1),
})

export const addTemplateByUploadSchema = z.object({
    certificateId: z.string().min(1),
    file: z.instanceof(File).refine(file => file.size <= MAXIMUM_FILE_SIZE, {
        message: 'File size must be less than 5MB',
    }),
})

export const deleteTemplateSchema = z.object({
    certificateId: z.string().min(1),
})

export const refreshTemplateSchema = z.object({
    certificateId: z.string().min(1),
})

export const downloadTemplateSchema = z.object({
    certificateEmissionId: z.string().min(1),
})

// Certificate
export const generateCertificatesSchema = z.object({
    certificateId: z.string().min(1),
})

export const viewCertificateSchema = z.object({
    certificateEmissionId: z.string().min(1),
    certificateIndex: z.coerce.number().int().min(0),
})

export const downloadCertificateUrlSchema = z.object({
    certificateEmissionId: z.string().min(1),
    certificateIndex: z.coerce.number().int().min(0),
})

// Email
export const createEmailSchema = z.object({
    certificateId: z.string().min(1),
    subject: z.string().min(1).max(255),
    body: z.string().min(1),
    emailColumn: z.string().min(1).max(100),
    scheduledAt: z.date().nullable(),
})

// Variable Mapping
export const updateCertificateEmissionSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1).max(100).optional(),
    variableColumnMapping: z
        .record(z.string(), z.string().nullable())
        .nullable()
        .optional(),
})

// Utility
export const createWriteBucketSignedUrlSchema = z.object({
    certificateId: z.string().min(1),
    fileName: z.string().min(1),
    mimeType: z.enum([
        TEMPLATE_FILE_EXTENSION.PPTX,
        TEMPLATE_FILE_EXTENSION.DOCX,
    ]),
    type: z.enum(['TEMPLATE']),
})
